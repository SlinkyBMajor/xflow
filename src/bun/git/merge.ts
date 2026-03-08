export type MergeStrategy = "auto" | "pr" | "manual";

export interface MergeResult {
	success: boolean;
	strategy: MergeStrategy;
	conflicted: boolean;
	conflictFiles?: string[];
	prUrl?: string;
	error?: string;
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

export async function getWorktreeDiff(worktreePath: string): Promise<string> {
	// Stage all changes first so diff captures everything
	const staged = await runGit(worktreePath, ["diff", "--cached"]);
	const unstaged = await runGit(worktreePath, ["diff"]);
	const untracked = await runGit(worktreePath, ["ls-files", "--others", "--exclude-standard"]);

	const parts: string[] = [];
	if (staged.stdout) parts.push("=== Staged Changes ===\n" + staged.stdout);
	if (unstaged.stdout) parts.push("=== Unstaged Changes ===\n" + unstaged.stdout);
	if (untracked.stdout) parts.push("=== Untracked Files ===\n" + untracked.stdout);

	return parts.join("\n\n") || "(no changes)";
}

export async function mergeWorktreeBranch(
	projectPath: string,
	branch: string,
	strategy: MergeStrategy,
	baseBranch: string,
): Promise<MergeResult> {
	switch (strategy) {
		case "auto":
			return autoMerge(projectPath, branch, baseBranch);
		case "pr":
			return createPR(projectPath, branch);
		case "manual":
			return { success: true, strategy: "manual", conflicted: false };
	}
}

async function autoMerge(projectPath: string, branch: string, baseBranch: string): Promise<MergeResult> {
	// Checkout base branch first
	const checkout = await runGit(projectPath, ["checkout", baseBranch]);
	if (checkout.exitCode !== 0) {
		return { success: false, strategy: "auto", conflicted: false, error: `Failed to checkout ${baseBranch}: ${checkout.stderr}` };
	}

	// Attempt merge
	const merge = await runGit(projectPath, ["merge", "--no-ff", branch]);
	if (merge.exitCode === 0) {
		return { success: true, strategy: "auto", conflicted: false };
	}

	// Check if it's a conflict
	const status = await runGit(projectPath, ["diff", "--name-only", "--diff-filter=U"]);
	if (status.stdout) {
		const conflictFiles = status.stdout.split("\n").filter(Boolean);
		// Abort the merge so the repo isn't left in a conflicted state
		await runGit(projectPath, ["merge", "--abort"]);
		return { success: false, strategy: "auto", conflicted: true, conflictFiles };
	}

	// Non-conflict merge failure
	await runGit(projectPath, ["merge", "--abort"]);
	return { success: false, strategy: "auto", conflicted: false, error: merge.stderr };
}

async function createPR(projectPath: string, branch: string): Promise<MergeResult> {
	// Push branch to origin
	const push = await runGit(projectPath, ["push", "origin", branch]);
	if (push.exitCode !== 0) {
		return { success: false, strategy: "pr", conflicted: false, error: `Failed to push: ${push.stderr}` };
	}

	// Create PR via gh CLI
	const pr = Bun.spawn(
		["gh", "pr", "create", "--head", branch, "--fill"],
		{ cwd: projectPath, stdout: "pipe", stderr: "pipe" },
	);

	const [prStdout, prStderr] = await Promise.all([
		new Response(pr.stdout).text(),
		new Response(pr.stderr).text(),
	]);
	await pr.exited;

	if (pr.exitCode !== 0) {
		return { success: false, strategy: "pr", conflicted: false, error: `Failed to create PR: ${prStderr.trim()}` };
	}

	const prUrl = prStdout.trim();
	return { success: true, strategy: "pr", conflicted: false, prUrl };
}
