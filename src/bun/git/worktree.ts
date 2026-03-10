export interface WorktreeInfo {
	path: string;
	branch: string;
	runId: string;
	ticketId: string;
}

async function runGit(cwd: string, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	const proc = Bun.spawn(["git", ...args], {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
	});

	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	await proc.exited;

	return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: proc.exitCode ?? 1 };
}

export async function isGitRepo(projectPath: string): Promise<boolean> {
	const result = await runGit(projectPath, ["rev-parse", "--is-inside-work-tree"]);
	return result.exitCode === 0 && result.stdout === "true";
}

export async function getCurrentBranch(projectPath: string): Promise<string> {
	const result = await runGit(projectPath, ["rev-parse", "--abbrev-ref", "HEAD"]);
	if (result.exitCode !== 0) throw new Error(`Failed to get current branch: ${result.stderr}`);
	return result.stdout;
}

export async function createWorktree(
	projectPath: string,
	runId: string,
	ticketId: string,
): Promise<WorktreeInfo> {
	const branch = `xflow/${ticketId.slice(0, 8)}-${runId.slice(0, 8)}`;
	const worktreePath = `${projectPath}/.xflow/worktrees/${runId}`;

	const result = await runGit(projectPath, ["worktree", "add", "-b", branch, worktreePath]);
	if (result.exitCode !== 0) {
		throw new Error(`Failed to create worktree: ${result.stderr}`);
	}

	return { path: worktreePath, branch, runId, ticketId };
}

export async function removeWorktree(projectPath: string, worktreePath: string): Promise<void> {
	// Get the branch name before removing the worktree
	const branchResult = await runGit(worktreePath, ["rev-parse", "--abbrev-ref", "HEAD"]);
	const branch = branchResult.exitCode === 0 ? branchResult.stdout : null;

	const result = await runGit(projectPath, ["worktree", "remove", worktreePath, "--force"]);
	if (result.exitCode !== 0) {
		console.error(`[Worktree] Failed to remove worktree ${worktreePath}: ${result.stderr}`);
	}

	// Clean up the branch
	if (branch && branch.startsWith("xflow/")) {
		const delResult = await runGit(projectPath, ["branch", "-d", branch]);
		if (delResult.exitCode !== 0) {
			// Try force delete if normal delete fails (unmerged branch)
			await runGit(projectPath, ["branch", "-D", branch]);
		}
	}
}

export async function worktreeHasChanges(worktreePath: string): Promise<boolean> {
	const result = await runGit(worktreePath, ["status", "--porcelain"]);
	if (result.exitCode !== 0) return false;
	return result.stdout.length > 0;
}

export async function worktreeExists(worktreePath: string): Promise<boolean> {
	const { existsSync } = await import("fs");
	if (!existsSync(worktreePath)) return false;
	// Verify it's still a valid git worktree
	const result = await runGit(worktreePath, ["rev-parse", "--is-inside-work-tree"]);
	return result.exitCode === 0 && result.stdout === "true";
}

export async function pruneOrphanedWorktrees(projectPath: string, activeRunIds: string[]): Promise<void> {
	const { existsSync, readdirSync } = await import("fs");

	const worktreesDir = `${projectPath}/.xflow/worktrees`;
	if (!existsSync(worktreesDir)) return;

	const entries = readdirSync(worktreesDir, { withFileTypes: true });
	const activeSet = new Set(activeRunIds);

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		if (activeSet.has(entry.name)) continue;

		const worktreePath = `${worktreesDir}/${entry.name}`;
		console.log(`[Worktree] Pruning orphaned worktree: ${worktreePath}`);
		try {
			await removeWorktree(projectPath, worktreePath);
		} catch (err) {
			console.error(`[Worktree] Failed to prune ${worktreePath}:`, err);
		}
	}

	// Also run git worktree prune to clean up stale refs
	await runGit(projectPath, ["worktree", "prune"]);
}
