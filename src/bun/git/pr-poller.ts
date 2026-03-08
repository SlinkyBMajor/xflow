import type { DB } from "../db/connection";
import type { MergeResult } from "../../shared/types";
import * as runQueries from "../db/queries/runs";
import { removeWorktree } from "./worktree";

const POLL_INTERVAL_MS = 60_000;

interface PollContext {
	projectPath: string;
	getDb: () => DB;
	notify: {
		worktreeMergeResult: (data: { runId: string; result: MergeResult }) => void;
		worktreeCleanupDone: (data: { runId: string }) => void;
	};
}

let intervalId: ReturnType<typeof setInterval> | null = null;
let activeContext: PollContext | null = null;

async function checkPrStatus(prUrl: string, projectPath: string): Promise<"OPEN" | "MERGED" | "CLOSED" | null> {
	try {
		const proc = Bun.spawn(
			["gh", "pr", "view", prUrl, "--json", "state", "--jq", ".state"],
			{ cwd: projectPath, stdout: "pipe", stderr: "pipe" },
		);

		const stdout = await Promise.race([
			new Response(proc.stdout).text(),
			new Promise<string>((_, reject) => setTimeout(() => reject(new Error("timeout")), 10_000)),
		]);
		await proc.exited;

		if (proc.exitCode !== 0) return null;

		const state = stdout.trim() as "OPEN" | "MERGED" | "CLOSED";
		return state;
	} catch (err) {
		console.error(`[PR Poller] Failed to check PR status for ${prUrl}:`, err);
		return null;
	}
}

async function pollOpenPRs(ctx: PollContext) {
	try {
		const db = ctx.getDb();
		const runs = runQueries.getRunsWithWorktrees(db);

		const prRuns = runs.filter(
			(r) => r.mergeResult?.success && r.mergeResult.strategy === "pr" && r.mergeResult.prUrl,
		);

		if (prRuns.length === 0) return;

		console.log(`[PR Poller] Checking ${prRuns.length} open PR(s)`);

		for (const run of prRuns) {
			// Verify context hasn't changed mid-poll
			if (activeContext !== ctx) return;

			const state = await checkPrStatus(run.mergeResult!.prUrl!, ctx.projectPath);
			if (state !== "MERGED") continue;

			console.log(`[PR Poller] PR merged: ${run.mergeResult!.prUrl}`);

			// Clean up worktree
			if (run.worktreePath) {
				try {
					await removeWorktree(ctx.projectPath, run.worktreePath);
				} catch (err) {
					console.error(`[PR Poller] Failed to remove worktree:`, err);
				}
			}

			// Update DB
			runQueries.updateRun(db, run.id, { worktreePath: null, worktreeBranch: null });

			// Notify webview
			ctx.notify.worktreeCleanupDone({ runId: run.id });
		}
	} catch (err) {
		console.error(`[PR Poller] Poll error:`, err);
	}
}

export function startPrPoller(ctx: PollContext) {
	stopPrPoller();
	activeContext = ctx;

	// Run once immediately
	pollOpenPRs(ctx);

	intervalId = setInterval(() => pollOpenPRs(ctx), POLL_INTERVAL_MS);
	console.log(`[PR Poller] Started (interval: ${POLL_INTERVAL_MS}ms)`);
}

export function stopPrPoller() {
	if (intervalId) {
		clearInterval(intervalId);
		intervalId = null;
	}
	activeContext = null;
}
