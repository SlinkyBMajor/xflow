import type { DB } from "../db/connection";
import type { Ticket, GitActionConfig, RunEvent } from "../../shared/types";
import type { WorkflowContext } from "./interpolate";
import { interpolate } from "./interpolate";
import * as runQueries from "../db/queries/runs";
import * as ticketQueries from "../db/queries/tickets";
import { mergeWorktreeBranch } from "../git/merge";
import { getCurrentBranch } from "../git/worktree";
import { removeWorktree } from "../git/worktree";

interface GitActionParams {
	runId: string;
	nodeId: string;
	config: GitActionConfig;
	ticket: Ticket;
	context: WorkflowContext;
	db: DB;
	projectPath?: string;
	onEvent?: (event: RunEvent) => void;
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

export async function executeGitAction(params: GitActionParams): Promise<Record<string, unknown>> {
	const { runId, nodeId, config, ticket, context, db, projectPath, onEvent } = params;

	insertAndEmit(db, runId, "GIT_ACTION_STARTED", { nodeId, action: config.action }, onEvent);

	switch (config.action) {
		case "createPr":
			return createPr(params);
		case "addReviewer":
			return addReviewer(params);
		case "mergePr":
			return mergePr(params);
		default:
			throw new Error(`Unknown git action: ${(config as any).action}`);
	}
}

async function createPr(params: GitActionParams): Promise<Record<string, unknown>> {
	const { runId, config, ticket, context, db, projectPath, onEvent } = params;

	// Get worktree info from the run record
	const run = runQueries.getRunById(db, runId);
	if (!run?.worktreeBranch || !run?.worktreePath) {
		throw new Error("createPr requires a worktree branch. Ensure an upstream Claude Agent node has worktree enabled.");
	}

	const baseBranch = config.baseBranch
		? interpolate(config.baseBranch, context)
		: (projectPath ? await getCurrentBranch(projectPath) : "main");

	const prTitle = config.prTitle ? interpolate(config.prTitle, context) : undefined;
	const prBody = config.prBody ? interpolate(config.prBody, context) : undefined;

	const result = await mergeWorktreeBranch(
		projectPath!,
		run.worktreeBranch,
		"pr",
		baseBranch,
		run.worktreePath ?? undefined,
		{
			ticketTitle: prTitle ?? ticket.title,
			ticketBody: prBody ?? ticket.body,
		},
	);

	if (!result.success) {
		throw new Error(`Failed to create PR: ${result.error ?? "unknown error"}`);
	}

	// Parse PR number from URL
	const prUrl = result.prUrl ?? "";
	const prNumberMatch = prUrl.match(/\/pull\/(\d+)/);
	const prNumber = prNumberMatch ? parseInt(prNumberMatch[1], 10) : undefined;

	// Update run merge result
	runQueries.updateRun(db, runId, {
		mergeResult: { ...result, prNumber },
	});

	// Write PR metadata to ticket
	const ticketData = ticketQueries.getTicket(db, ticket.id);
	if (ticketData) {
		ticketQueries.updateTicket(db, ticket.id, {
			metadata: {
				...ticketData.metadata,
				prUrl,
				prNumber,
				branch: run.worktreeBranch,
			},
		});
	}

	insertAndEmit(db, runId, "GIT_ACTION_PR_CREATED", {
		prUrl,
		prNumber,
		branch: run.worktreeBranch,
	}, onEvent);

	return { prUrl, prNumber, branch: run.worktreeBranch };
}

async function resolvePrNumber(config: GitActionConfig, context: WorkflowContext, params: GitActionParams): Promise<string> {
	if (config.prNumber) {
		return interpolate(config.prNumber, context);
	}
	// Fall back to ticket metadata
	const ticket = ticketQueries.getTicket(params.db, params.ticket.id);
	const fromMeta = ticket?.metadata?.prNumber;
	if (fromMeta != null) {
		return String(fromMeta);
	}
	throw new Error("No prNumber configured and none found in ticket metadata. Ensure an upstream createPr has run.");
}

async function addReviewer(params: GitActionParams): Promise<Record<string, unknown>> {
	const { runId, config, context, db, projectPath, onEvent } = params;

	const prNumber = await resolvePrNumber(config, context, params);
	const reviewer = config.reviewer ? interpolate(config.reviewer, context) : undefined;
	if (!reviewer) {
		throw new Error("addReviewer requires a reviewer username");
	}

	const proc = Bun.spawn(
		["gh", "pr", "edit", prNumber, "--add-reviewer", reviewer],
		{ cwd: projectPath, stdout: "pipe", stderr: "pipe" },
	);

	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	await proc.exited;

	if (proc.exitCode !== 0) {
		throw new Error(`Failed to add reviewer: ${stderr.trim()}`);
	}

	insertAndEmit(db, runId, "GIT_ACTION_REVIEWER_ADDED", {
		prNumber,
		reviewer,
	}, onEvent);

	return { success: true, prNumber, reviewer };
}

async function mergePr(params: GitActionParams): Promise<Record<string, unknown>> {
	const { runId, config, context, db, projectPath, onEvent } = params;

	const prNumber = await resolvePrNumber(config, context, params);
	const mergeMethod = config.mergeMethod ?? "squash";

	const proc = Bun.spawn(
		["gh", "pr", "merge", prNumber, `--${mergeMethod}`],
		{ cwd: projectPath, stdout: "pipe", stderr: "pipe" },
	);

	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	await proc.exited;

	if (proc.exitCode !== 0) {
		throw new Error(`Failed to merge PR: ${stderr.trim()}`);
	}

	// Update run merge result
	const run = runQueries.getRunById(db, runId);
	const existingMergeResult = run?.mergeResult;
	runQueries.updateRun(db, runId, {
		mergeResult: {
			...(existingMergeResult ?? { success: true, strategy: "pr" as const, conflicted: false }),
			prMerged: true,
		},
	});

	// Clean up worktree if it exists
	if (run?.worktreePath && projectPath) {
		await removeWorktree(projectPath, run.worktreePath);
		runQueries.updateRun(db, runId, { worktreePath: null });
	}

	insertAndEmit(db, runId, "GIT_ACTION_PR_MERGED", {
		prNumber,
		mergeMethod,
	}, onEvent);

	return { merged: true, prNumber, mergeMethod };
}
