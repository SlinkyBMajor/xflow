export type MergeStrategy = "direct" | "pr";

export interface MergeResult {
	success: boolean;
	strategy: MergeStrategy;
	conflicted: boolean;
	conflictFiles?: string[];
	prUrl?: string;
	error?: string;
}

async function runGit(cwd: string, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	console.log(`[Git] Running: git ${args.join(" ")} (cwd: ${cwd})`);
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

	const result = { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: proc.exitCode ?? 1 };
	if (result.exitCode !== 0) {
		console.log(`[Git] Exit ${result.exitCode}: ${result.stderr || "(no stderr)"}`);
	}
	return result;
}

export async function getWorktreeDiff(worktreePath: string): Promise<string> {
	const staged = await runGit(worktreePath, ["diff", "--cached"]);
	const unstaged = await runGit(worktreePath, ["diff"]);
	const untracked = await runGit(worktreePath, ["ls-files", "--others", "--exclude-standard"]);

	const parts: string[] = [];
	if (staged.stdout) parts.push("=== Staged Changes ===\n" + staged.stdout);
	if (unstaged.stdout) parts.push("=== Unstaged Changes ===\n" + unstaged.stdout);
	if (untracked.stdout) parts.push("=== Untracked Files ===\n" + untracked.stdout);

	return parts.join("\n\n") || "(no changes)";
}

export interface PRContext {
	ticketTitle?: string;
	ticketBody?: string | null;
}

export async function mergeWorktreeBranch(
	projectPath: string,
	branch: string,
	strategy: MergeStrategy,
	baseBranch: string,
	worktreePath?: string,
	prContext?: PRContext,
): Promise<MergeResult> {
	console.log(`[Merge] Strategy: ${strategy}, branch: ${branch}, base: ${baseBranch}, worktree: ${worktreePath ?? "n/a"}`);
	switch (strategy) {
		case "direct":
			return directMerge(projectPath, branch, baseBranch, worktreePath);
		case "pr":
			return createPR(projectPath, branch, baseBranch, worktreePath, prContext);
	}
}

async function directMerge(projectPath: string, branch: string, baseBranch: string, worktreePath?: string): Promise<MergeResult> {
	console.log(`[Merge] Direct-merging ${branch} into ${baseBranch}`);

	// Commit any uncommitted changes in the worktree before merging
	if (worktreePath) {
		const committed = await commitWorktreeChanges(worktreePath);
		if (!committed) {
			const error = "Failed to commit agent changes in worktree before merge";
			console.error(`[Merge] ${error}`);
			return { success: false, strategy: "direct", conflicted: false, error };
		}
	}

	const checkout = await runGit(projectPath, ["checkout", baseBranch]);
	if (checkout.exitCode !== 0) {
		const error = `Failed to checkout ${baseBranch}: ${checkout.stderr}`;
		console.error(`[Merge] ${error}`);
		return { success: false, strategy: "direct", conflicted: false, error };
	}

	const merge = await runGit(projectPath, ["merge", "--no-ff", branch]);
	if (merge.exitCode === 0) {
		console.log(`[Merge] Direct merge succeeded`);
		return { success: true, strategy: "direct", conflicted: false };
	}

	// Check if it's a conflict
	const status = await runGit(projectPath, ["diff", "--name-only", "--diff-filter=U"]);
	if (status.stdout) {
		const conflictFiles = status.stdout.split("\n").filter(Boolean);
		console.error(`[Merge] Conflicts in: ${conflictFiles.join(", ")}`);
		await runGit(projectPath, ["merge", "--abort"]);
		return { success: false, strategy: "direct", conflicted: true, conflictFiles };
	}

	// Non-conflict merge failure
	const error = merge.stderr;
	console.error(`[Merge] Direct merge failed: ${error}`);
	await runGit(projectPath, ["merge", "--abort"]);
	return { success: false, strategy: "direct", conflicted: false, error };
}

async function commitWorktreeChanges(worktreePath: string): Promise<boolean> {
	// Check for any uncommitted changes (staged, unstaged, or untracked)
	const status = await runGit(worktreePath, ["status", "--porcelain"]);
	if (!status.stdout) {
		console.log(`[Merge] No uncommitted changes in worktree`);
		return true; // nothing to commit, but that's fine
	}

	console.log(`[Merge] Committing uncommitted changes in worktree:\n${status.stdout}`);

	// Stage everything
	const add = await runGit(worktreePath, ["add", "-A"]);
	if (add.exitCode !== 0) {
		console.error(`[Merge] Failed to stage changes: ${add.stderr}`);
		return false;
	}

	// Commit
	const commit = await runGit(worktreePath, ["commit", "-m", "xflow: agent changes"]);
	if (commit.exitCode !== 0) {
		console.error(`[Merge] Failed to commit: ${commit.stderr}`);
		return false;
	}

	console.log(`[Merge] Committed agent changes`);
	return true;
}

async function buildPRContent(
	pushCwd: string,
	baseBranch: string,
	branch: string,
	context?: PRContext,
): Promise<{ title: string; body: string }> {
	const title = context?.ticketTitle
		? `xflow: ${context.ticketTitle}`
		: branch;

	const bodyParts: string[] = [];

	// Ticket description
	if (context?.ticketBody) {
		bodyParts.push("## Description\n\n" + context.ticketBody);
	}

	// Commit log
	const log = await runGit(pushCwd, ["log", `${baseBranch}..${branch}`, "--pretty=format:- %s"]);
	if (log.exitCode === 0 && log.stdout) {
		bodyParts.push("## Commits\n\n" + log.stdout);
	}

	// Diff summary
	const diffstat = await runGit(pushCwd, ["diff", "--stat", `${baseBranch}...${branch}`]);
	if (diffstat.exitCode === 0 && diffstat.stdout) {
		bodyParts.push("## Changes\n\n```\n" + diffstat.stdout + "\n```");
	}

	bodyParts.push("---\n*Created by [XFlow](https://github.com/pontusrheindorf/xflow)*");

	return { title, body: bodyParts.join("\n\n") };
}

async function createPR(projectPath: string, branch: string, baseBranch: string, worktreePath?: string, context?: PRContext): Promise<MergeResult> {
	console.log(`[Merge] Creating PR for branch ${branch}`);

	// The worktree is where the branch HEAD lives — commit and push from there
	const pushCwd = worktreePath ?? projectPath;

	// Commit any uncommitted changes first
	if (worktreePath) {
		const committed = await commitWorktreeChanges(worktreePath);
		if (!committed) {
			const error = "Failed to commit agent changes in worktree before push";
			console.error(`[Merge] ${error}`);
			return { success: false, strategy: "pr", conflicted: false, error };
		}
	}

	// Push branch to origin (from the worktree so the branch ref is current)
	const push = await runGit(pushCwd, ["push", "-u", "origin", branch]);
	if (push.exitCode !== 0) {
		const error = `Failed to push: ${push.stderr}`;
		console.error(`[Merge] ${error}`);
		return { success: false, strategy: "pr", conflicted: false, error };
	}
	console.log(`[Merge] Pushed ${branch} to origin`);

	// Check if a PR already exists for this branch
	const existingPr = Bun.spawn(
		["gh", "pr", "view", branch, "--json", "url", "-q", ".url"],
		{ cwd: projectPath, stdout: "pipe", stderr: "pipe" },
	);
	const [existingUrl, existingErr] = await Promise.all([
		new Response(existingPr.stdout).text(),
		new Response(existingPr.stderr).text(),
	]);
	await existingPr.exited;

	if (existingPr.exitCode === 0 && existingUrl.trim()) {
		// PR already exists — push updated the branch, so we're done
		const prUrl = existingUrl.trim();
		console.log(`[Merge] Existing PR updated with new commits: ${prUrl}`);
		return { success: true, strategy: "pr", conflicted: false, prUrl };
	}

	// Build PR title and body from ticket context + git history
	const { title, body } = await buildPRContent(pushCwd, baseBranch, branch, context);

	// Create PR via gh CLI (run from project root so gh finds the repo config)
	console.log(`[Merge] Creating PR via gh CLI`);
	const pr = Bun.spawn(
		["gh", "pr", "create", "--head", branch, "--title", title, "--body", body],
		{ cwd: projectPath, stdout: "pipe", stderr: "pipe" },
	);

	const [prStdout, prStderr] = await Promise.all([
		new Response(pr.stdout).text(),
		new Response(pr.stderr).text(),
	]);
	await pr.exited;

	if (pr.exitCode !== 0) {
		const error = `Failed to create PR: ${prStderr.trim()}`;
		console.error(`[Merge] ${error}`);
		return { success: false, strategy: "pr", conflicted: false, error };
	}

	const prUrl = prStdout.trim();
	console.log(`[Merge] PR created: ${prUrl}`);
	return { success: true, strategy: "pr", conflicted: false, prUrl };
}
