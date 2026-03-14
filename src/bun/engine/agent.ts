import { mkdirSync, writeFileSync } from "fs";
import type { DB } from "../db/connection";
import type { Ticket, RunEvent, ClaudeModel, AllowedToolsPreset } from "../../shared/types";
import { ALLOWED_TOOLS_PRESETS } from "../../shared/types";
import type { WorkflowContext } from "./interpolate";
import { interpolate } from "./interpolate";
import * as runQueries from "../db/queries/runs";
import * as ticketQueries from "../db/queries/tickets";
import * as commentQueries from "../db/queries/comments";
import { isGitRepo, createWorktree, worktreeHasChanges, removeWorktree, getCurrentBranch, worktreeExists } from "../git/worktree";
import { createToken, revokeToken } from "../server/agent-tokens";

interface ClaudeAgentParams {
	runId: string;
	nodeId: string;
	prompt: string;
	timeoutMs?: number;
	includeWorkflowOutput?: boolean;
	worktreeEnabled?: boolean;
	ticket: Ticket;
	context: WorkflowContext;
	db: DB;
	projectPath?: string;
	apiPort?: number;
	onEvent?: (event: RunEvent) => void;
	model?: ClaudeModel;
	maxTurns?: number;
	systemPrompt?: string;
	skipPermissions?: boolean;
	allowedToolsPreset?: AllowedToolsPreset;
	allowedToolsCustom?: string;
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
		ticket,
		context,
		db,
		projectPath,
		apiPort,
		onEvent,
		model,
		maxTurns,
		systemPrompt,
		skipPermissions = true,
		allowedToolsPreset,
		allowedToolsCustom,
	} = params;

	const baseCwd = projectPath ?? process.cwd();
	let agentCwd = baseCwd;
	let worktreeBranch: string | null = null;
	let worktreePath: string | null = null;

	// Create or reuse worktree for isolated execution if enabled
	if (worktreeEnabled && projectPath) {
		const isRepo = await isGitRepo(projectPath);
		if (isRepo) {

			// Check if a previous run for this ticket left an existing worktree
			const previousRun = runQueries.getLatestWorktreeRunForTicket(db, ticket.id);
			const canReuse = previousRun?.worktreePath
				&& previousRun.id !== runId
				&& await worktreeExists(previousRun.worktreePath);

			if (canReuse && previousRun.worktreePath && previousRun.worktreeBranch) {
				// Reuse existing worktree — agent continues where the last run left off
				agentCwd = previousRun.worktreePath;
				worktreeBranch = previousRun.worktreeBranch;
				worktreePath = previousRun.worktreePath;
				runQueries.updateRun(db, runId, { worktreePath, worktreeBranch });
				// Clear worktree ref from the old run so it's owned by the new one
				runQueries.updateRun(db, previousRun.id, { worktreePath: null, worktreeBranch: null });
				insertAndEmit(db, runId, "WORKTREE_REUSED", {
					path: worktreePath,
					branch: worktreeBranch,
					previousRunId: previousRun.id,
				}, onEvent);
			} else {
				const wt = await createWorktree(projectPath, runId, ticket.id);
				agentCwd = wt.path;
				worktreeBranch = wt.branch;
				worktreePath = wt.path;
				runQueries.updateRun(db, runId, { worktreePath: wt.path, worktreeBranch: wt.branch });
				insertAndEmit(db, runId, "WORKTREE_CREATED", { path: wt.path, branch: wt.branch }, onEvent);
			}
		}
	}

	const runDir = `${baseCwd}/.xflow/runs/${runId}`;
	mkdirSync(runDir, { recursive: true });

	// Re-fetch ticket to get latest metadata (e.g. output from a previous lane's workflow)
	const freshTicket = ticketQueries.getTicket(db, ticket.id) ?? ticket;

	const resolvedPrompt = interpolate(prompt, context);

	// Separate workflow output from user metadata
	const { _workflowOutput, ...userMetadata } = freshTicket.metadata as Record<string, unknown>;
	// Handle both array (new) and object (old) formats
	const workflowOutputEntries: { nodeId: string; output: string; completedAt: string; label?: string }[] = [];
	if (Array.isArray(_workflowOutput)) {
		for (const entry of _workflowOutput) {
			workflowOutputEntries.push({
				nodeId: entry.nodeId,
				output: entry.output,
				completedAt: entry.completedAt,
				label: entry.label,
			});
		}
	} else if (_workflowOutput && typeof _workflowOutput === "object") {
		for (const [nodeId, entry] of Object.entries(_workflowOutput as Record<string, any>)) {
			workflowOutputEntries.push({
				nodeId,
				output: entry.output,
				completedAt: entry.completedAt,
				label: entry.label,
			});
		}
	}

	// Fetch comments for this ticket
	const comments = commentQueries.getCommentsByTicket(db, ticket.id);

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

	const hasOutputs = includeWorkflowOutput && workflowOutputEntries.length > 0;
	const hasComments = comments.length > 0;

	if (hasOutputs || hasComments) {
		// Build a chronological timeline of outputs and comments
		type TimelineItem =
			| { kind: "output"; label: string; timestamp: string; content: string }
			| { kind: "comment"; timestamp: string; content: string; refLabel: string | null };

		const timeline: TimelineItem[] = [];

		if (hasOutputs) {
			for (const entry of workflowOutputEntries) {
				timeline.push({
					kind: "output",
					label: entry.label ?? `Node ${entry.nodeId.slice(0, 8)}`,
					timestamp: entry.completedAt,
					content: entry.output,
				});
			}
		}

		for (const comment of comments) {
			timeline.push({
				kind: "comment",
				timestamp: comment.createdAt,
				content: comment.body,
				refLabel: comment.refLabel,
			});
		}

		timeline.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

		const formatted = timeline.map((item) => {
			if (item.kind === "output") {
				return `### ${item.label} (agent, ${item.timestamp})\n${item.content}`;
			}
			const ref = item.refLabel ? `, re: ${item.refLabel}` : "";
			return `### User Feedback (${item.timestamp}${ref})\n${item.content}`;
		});

		sections.push(`\n## Prior Workflow Output & Feedback\n\n${formatted.join("\n\n---\n\n")}`);
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

	// Build CLI arguments dynamically based on config
	const cliArgs = ["claude", "-p", fullPrompt, "--output-format", "stream-json", "--verbose"];

	if (model) {
		cliArgs.push("--model", model);
	}

	if (maxTurns && maxTurns > 0) {
		cliArgs.push("--max-turns", String(maxTurns));
	}

	if (systemPrompt) {
		cliArgs.push("--append-system-prompt", systemPrompt);
	}

	if (skipPermissions) {
		cliArgs.push("--dangerously-skip-permissions");
	}

	// Resolve allowed tools from preset or custom list.
	// This works alongside skipPermissions — skip auto-approves tool use,
	// allowedTools restricts which tools are available.
	let tools: string[] | undefined;
	if (allowedToolsPreset === "custom" && allowedToolsCustom) {
		tools = allowedToolsCustom.split(",").map((t) => t.trim()).filter(Boolean);
	} else if (allowedToolsPreset && allowedToolsPreset !== "custom") {
		tools = ALLOWED_TOOLS_PRESETS[allowedToolsPreset];
	}
	if (tools && tools.length > 0) {
		cliArgs.push("--allowedTools", tools.join(","));
	}

	const proc = Bun.spawn(cliArgs, {
		cwd: agentCwd,
		stdout: "pipe",
		stderr: "pipe",
		env: spawnEnv,
	});

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

	// Handle worktree after successful agent execution
	if (worktreePath && worktreeBranch && projectPath) {
		const hasChanges = await worktreeHasChanges(worktreePath);
		if (!hasChanges) {
			// No changes — clean up the worktree
			await removeWorktree(projectPath, worktreePath);
			runQueries.updateRun(db, runId, { worktreePath: null, worktreeBranch: null });
			insertAndEmit(db, runId, "WORKTREE_CLEANUP", { reason: "no_changes" }, onEvent);
		} else {
			// Changes present — leave worktree for downstream gitAction nodes
			insertAndEmit(db, runId, "WORKTREE_READY", {
				path: worktreePath,
				branch: worktreeBranch,
			}, onEvent);
		}
	}

	return outputText;
}
