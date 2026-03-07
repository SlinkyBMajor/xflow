import { mkdirSync, writeFileSync } from "fs";
import type { DB } from "../db/connection";
import type { Ticket, RunEvent } from "../../shared/types";
import type { WorkflowContext } from "./interpolate";
import { interpolate } from "./interpolate";
import * as runQueries from "../db/queries/runs";

interface ClaudeAgentParams {
	runId: string;
	nodeId: string;
	prompt: string;
	timeoutMs?: number;
	ticket: Ticket;
	context: WorkflowContext;
	db: DB;
	projectPath?: string;
	onEvent?: (event: RunEvent) => void;
}

const activeProcesses = new Map<string, { kill: () => void }>();

export function killAgentProcess(runId: string): void {
	const proc = activeProcesses.get(runId);
	if (proc) {
		proc.kill();
		activeProcesses.delete(runId);
	}
}

function insertAndEmit(
	db: DB,
	runId: string,
	type: string,
	payload: unknown,
	onEvent?: (event: RunEvent) => void,
): void {
	const event: RunEvent = {
		id: crypto.randomUUID(),
		runId,
		type,
		payload,
		timestamp: new Date().toISOString(),
	};
	runQueries.insertRunEvent(db, event);
	onEvent?.(event);
}

export async function executeClaudeAgent(params: ClaudeAgentParams): Promise<string> {
	const {
		runId,
		nodeId,
		prompt,
		timeoutMs = 5 * 60 * 1000,
		ticket,
		context,
		db,
		projectPath,
		onEvent,
	} = params;

	const cwd = projectPath ?? process.cwd();
	const runDir = `${cwd}/.xflow/runs/${runId}`;
	mkdirSync(runDir, { recursive: true });

	const resolvedPrompt = interpolate(prompt, context);

	const contextDoc = [
		`# Ticket: ${ticket.title}`,
		ticket.body ? `\n${ticket.body}` : "",
		Object.keys(ticket.metadata).length > 0
			? `\n## Metadata\n${JSON.stringify(ticket.metadata, null, 2)}`
			: "",
		ticket.tags.length > 0 ? `\n## Tags\n${ticket.tags.join(", ")}` : "",
		`\n## Instructions\n${resolvedPrompt}`,
	].join("\n");

	writeFileSync(`${runDir}/context.md`, contextDoc);

	insertAndEmit(db, runId, "AGENT_STARTED", { nodeId, prompt: resolvedPrompt }, onEvent);

	const fullPrompt = `${contextDoc}`;

	const proc = Bun.spawn(
		["claude", "-p", fullPrompt, "--output-format", "stream-json", "--verbose"],
		{
			cwd,
			stdout: "pipe",
			stderr: "pipe",
		},
	);

	activeProcesses.set(runId, proc);

	let outputText = "";
	let timedOut = false;

	const timeout = setTimeout(() => {
		timedOut = true;
		proc.kill();
	}, timeoutMs);

	try {
		const reader = proc.stdout.getReader();
		const decoder = new TextDecoder();
		let buffer = "";

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed) continue;

				try {
					const event = JSON.parse(trimmed);
					insertAndEmit(db, runId, "AGENT_OUTPUT", event, onEvent);

					// Claude CLI stream-json: assistant text is in event.message.content[]
					if (event.type === "assistant" && event.message?.content) {
						for (const block of event.message.content) {
							if (block.type === "text") {
								outputText += block.text;
							}
						}
					}

					// Claude CLI stream-json: final result text is in event.result (string)
					if (event.type === "result" && typeof event.result === "string") {
						// Result contains the full final text; replace accumulated
						// partial assistant text to avoid duplication
						outputText = event.result;
					}
				} catch {
					// Non-JSON line, ignore
				}
			}
		}

		// Process remaining buffer
		if (buffer.trim()) {
			try {
				const event = JSON.parse(buffer.trim());
				insertAndEmit(db, runId, "AGENT_OUTPUT", event, onEvent);
			} catch {
				// ignore
			}
		}

		await proc.exited;
	} finally {
		clearTimeout(timeout);
		activeProcesses.delete(runId);
	}

	if (timedOut) {
		insertAndEmit(db, runId, "AGENT_TIMEOUT", { nodeId, timeoutMs }, onEvent);
		throw new Error(`Claude agent timed out after ${timeoutMs}ms`);
	}

	writeFileSync(`${runDir}/output.md`, outputText || "(no output)");
	insertAndEmit(db, runId, "AGENT_COMPLETED", { nodeId, outputLength: outputText.length }, onEvent);

	return outputText;
}
