import { mkdirSync, writeFileSync } from "fs";
import type { DB } from "../db/connection";
import type { Ticket, RunEvent } from "../../shared/types";
import type { WorkflowContext } from "./interpolate";
import { interpolate } from "./interpolate";
import * as runQueries from "../db/queries/runs";
import * as ticketQueries from "../db/queries/tickets";
import { isGitRepo, createWorktree, worktreeHasChanges, removeWorktree, getCurrentBranch } from "../git/worktree";
import { mergeWorktreeBranch } from "../git/merge";
import type { MergeStrategy } from "../../shared/types";
import { createToken, revokeToken } from "../server/agent-tokens";

interface ClaudeAgentParams {
	runId: string;
	nodeId: string;
	prompt: string;
	timeoutMs?: number;
	includeWorkflowOutput?: boolean;
	worktreeEnabled?: boolean;
	mergeStrategy?: MergeStrategy;
	baseBranch?: string;
	ticket: Ticket;
	context: WorkflowContext;
	db: DB;
	projectPath?: string;
	apiPort?: number;
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
		timeoutMs = 10 * 60 * 1000,
		includeWorkflowOutput = true,
		worktreeEnabled = false,
		mergeStrategy,
		baseBranch: configBaseBranch,
		ticket,
		context,
		db,
		projectPath,
		apiPort,
		onEvent,
	} = params;

	const baseCwd = projectPath ?? process.cwd();
	let agentCwd = baseCwd;
	let worktreeBranch: string | null = null;
	let worktreePath: string | null = null;
	let resolvedBaseBranch: string | null = null;

	// Create worktree for isolated execution if enabled
	if (worktreeEnabled && projectPath) {
		const isRepo = await isGitRepo(projectPath);
		if (isRepo) {
			resolvedBaseBranch = configBaseBranch ?? await getCurrentBranch(projectPath);
			const wt = await createWorktree(projectPath, runId, ticket.id);
			agentCwd = wt.path;
			worktreeBranch = wt.branch;
			worktreePath = wt.path;
			runQueries.updateRun(db, runId, { worktreePath: wt.path, worktreeBranch: wt.branch });
			insertAndEmit(db, runId, "WORKTREE_CREATED", { path: wt.path, branch: wt.branch }, onEvent);
		}
	}

	const runDir = `${baseCwd}/.xflow/runs/${runId}`;
	mkdirSync(runDir, { recursive: true });

	// Re-fetch ticket to get latest metadata (e.g. output from a previous lane's workflow)
	const freshTicket = ticketQueries.getTicket(db, ticket.id) ?? ticket;

	const resolvedPrompt = interpolate(prompt, context);

	// Separate workflow output from user metadata
	const { _workflowOutput, ...userMetadata } = freshTicket.metadata as Record<string, unknown>;
	const workflowOutput = _workflowOutput as Record<string, { output: string; completedAt: string }> | undefined;

	const sections = [
		`# Ticket: ${freshTicket.title}`,
		freshTicket.body ? `\n${freshTicket.body}` : "",
	];

	if (Object.keys(userMetadata).length > 0) {
		sections.push(`\n## Metadata\n${JSON.stringify(userMetadata, null, 2)}`);
	}

	if (freshTicket.tags.length > 0) {
		sections.push(`\n## Tags\n${freshTicket.tags.join(", ")}`);
	}

	if (includeWorkflowOutput && workflowOutput && Object.keys(workflowOutput).length > 0) {
		const outputSections = Object.values(workflowOutput)
			.sort((a, b) => a.completedAt.localeCompare(b.completedAt))
			.map((entry) => entry.output);
		sections.push(`\n## Prior Workflow Output\n\n${outputSections.join("\n\n---\n\n")}`);
	}

	sections.push(`\n## Instructions\n${resolvedPrompt}`);

	if (apiPort) {
		sections.push(`\n## XFlow API
Set ticket metadata during this run:
\`\`\`bash
curl -X POST $XFLOW_API_URL/runs/$XFLOW_RUN_ID/metadata \\
  -H "Authorization: Bearer $XFLOW_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"key": "complexity", "value": "high"}'
\`\`\`

Get current ticket data:
\`\`\`bash
curl $XFLOW_API_URL/runs/$XFLOW_RUN_ID/ticket \\
  -H "Authorization: Bearer $XFLOW_API_TOKEN"
\`\`\`

Post a comment to the run log:
\`\`\`bash
curl -X POST $XFLOW_API_URL/runs/$XFLOW_RUN_ID/comment \\
  -H "Authorization: Bearer $XFLOW_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Found 3 issues to fix"}'
\`\`\``);
	}

	const contextDoc = sections.join("\n");

	writeFileSync(`${runDir}/context.md`, contextDoc);

	insertAndEmit(db, runId, "AGENT_STARTED", { nodeId, prompt: resolvedPrompt }, onEvent);

	const fullPrompt = `${contextDoc}`;

	// Build environment with API details if available
	let apiToken: string | undefined;
	const spawnEnv: Record<string, string | undefined> = { ...process.env };
	if (apiPort) {
		apiToken = createToken(runId);
		spawnEnv.XFLOW_API_URL = `http://127.0.0.1:${apiPort}`;
		spawnEnv.XFLOW_RUN_ID = runId;
		spawnEnv.XFLOW_API_TOKEN = apiToken;
		spawnEnv.XFLOW_TICKET_ID = ticket.id;
	}

	const proc = Bun.spawn(
		["claude", "-p", fullPrompt, "--output-format", "stream-json", "--verbose", "--dangerously-skip-permissions"],
		{
			cwd: agentCwd,
			stdout: "pipe",
			stderr: "pipe",
			env: spawnEnv,
		},
	);

	activeProcesses.set(runId, proc);

	let outputText = "";
	let stderrText = "";
	let timedOut = false;

	const timeout = setTimeout(() => {
		timedOut = true;
		proc.kill();
	}, timeoutMs);

	// Read stderr in background to capture error messages
	const stderrPromise = (async () => {
		const reader = proc.stderr.getReader();
		const decoder = new TextDecoder();
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			stderrText += decoder.decode(value, { stream: true });
		}
	})();

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
					if (event.type === "result" && typeof event.result === "string" && event.result.trim()) {
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
		await stderrPromise;
	} finally {
		clearTimeout(timeout);
		activeProcesses.delete(runId);
		if (apiPort) revokeToken(runId);
	}

	if (timedOut) {
		insertAndEmit(db, runId, "AGENT_TIMEOUT", { nodeId, timeoutMs }, onEvent);
		throw new Error(`Claude agent timed out after ${timeoutMs}ms`);
	}

	// Check for process failure
	if (proc.exitCode !== 0 && !outputText) {
		const errorDetail = stderrText.trim() || `Process exited with code ${proc.exitCode}`;
		console.error(`[Workflow ${runId}] Claude CLI failed (exit ${proc.exitCode}):`, errorDetail);
		throw new Error(`Claude CLI failed: ${errorDetail}`);
	}

	writeFileSync(`${runDir}/output.md`, outputText || "(no output)");
	insertAndEmit(db, runId, "AGENT_COMPLETED", { nodeId, outputLength: outputText.length }, onEvent);

	// Handle worktree merge after successful agent execution
	if (worktreePath && worktreeBranch && projectPath) {
		const hasChanges = await worktreeHasChanges(worktreePath);
		if (!hasChanges) {
			// No changes — clean up the worktree
			await removeWorktree(projectPath, worktreePath);
			runQueries.updateRun(db, runId, { worktreePath: null, worktreeBranch: null });
			insertAndEmit(db, runId, "WORKTREE_CLEANUP", { reason: "no_changes" }, onEvent);
		} else if (mergeStrategy === "auto" && resolvedBaseBranch) {
			const result = await mergeWorktreeBranch(projectPath, worktreeBranch, "auto", resolvedBaseBranch, worktreePath ?? undefined, { ticketTitle: ticket.title, ticketBody: ticket.body });
			insertAndEmit(db, runId, "WORKTREE_MERGE", result, onEvent);
			runQueries.updateRun(db, runId, { mergeResult: result });
			if (result.success) {
				await removeWorktree(projectPath, worktreePath);
				runQueries.updateRun(db, runId, { worktreePath: null });
			}
		} else if (mergeStrategy === "pr" && resolvedBaseBranch) {
			const result = await mergeWorktreeBranch(projectPath, worktreeBranch, "pr", resolvedBaseBranch, worktreePath ?? undefined, { ticketTitle: ticket.title, ticketBody: ticket.body });
			insertAndEmit(db, runId, "WORKTREE_MERGE", result, onEvent);
			runQueries.updateRun(db, runId, { mergeResult: result });
		} else {
			// manual strategy or no strategy set — leave for user
			insertAndEmit(db, runId, "WORKTREE_READY", {
				path: worktreePath,
				branch: worktreeBranch,
				strategy: mergeStrategy ?? "manual",
			}, onEvent);
		}
	}

	return outputText;
}
