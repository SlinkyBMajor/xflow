import type { GitChangeSummary } from "../../shared/types";

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

export async function getChangeSummary(worktreePath: string): Promise<GitChangeSummary> {
	const result = await runGit(worktreePath, ["status", "--porcelain"]);
	if (result.exitCode !== 0 || !result.stdout) {
		return { added: 0, modified: 0, deleted: 0, total: 0 };
	}

	let added = 0;
	let modified = 0;
	let deleted = 0;

	for (const line of result.stdout.split("\n")) {
		if (!line || line.length < 2) continue;
		const xy = line.slice(0, 2);

		if (xy === "??" || xy.includes("A")) {
			added++;
		} else if (xy.includes("D")) {
			deleted++;
		} else if (xy.includes("M") || xy.includes("R")) {
			modified++;
		}
	}

	return { added, modified, deleted, total: added + modified + deleted };
}
