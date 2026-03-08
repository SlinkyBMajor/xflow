import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GitChangeSummary } from "../../shared/types";

// Mock Bun.spawn to control runGit output
const mockSpawn = vi.fn();
vi.stubGlobal("Bun", { spawn: mockSpawn });

function mockGitOutput(stdout: string, exitCode = 0) {
	const stdoutBlob = new Blob([stdout]);
	const stderrBlob = new Blob([""]);
	mockSpawn.mockReturnValue({
		stdout: stdoutBlob.stream(),
		stderr: stderrBlob.stream(),
		exited: Promise.resolve(exitCode),
		exitCode,
	});
}

// Import after mocking
const { getChangeSummary } = await import("./status");

describe("getChangeSummary", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns zeros for empty output", async () => {
		mockGitOutput("");
		const result = await getChangeSummary("/fake/path");
		expect(result).toEqual({ added: 0, modified: 0, deleted: 0, total: 0 });
	});

	it("returns zeros for non-zero exit code", async () => {
		mockGitOutput("M  file.ts", 1);
		const result = await getChangeSummary("/fake/path");
		expect(result).toEqual({ added: 0, modified: 0, deleted: 0, total: 0 });
	});

	it("counts ?? lines as added", async () => {
		mockGitOutput("?? newfile.ts\n?? another.ts");
		const result = await getChangeSummary("/fake/path");
		expect(result.added).toBe(2);
		expect(result.total).toBe(2);
	});

	it("counts A  lines as added", async () => {
		mockGitOutput("A  staged.ts");
		const result = await getChangeSummary("/fake/path");
		expect(result.added).toBe(1);
	});

	it("counts M lines as modified", async () => {
		mockGitOutput("M  file.ts\n M unstaged.ts");
		const result = await getChangeSummary("/fake/path");
		expect(result.modified).toBe(2);
	});

	it("counts R lines as modified (renames)", async () => {
		mockGitOutput("R  old.ts -> new.ts");
		const result = await getChangeSummary("/fake/path");
		expect(result.modified).toBe(1);
	});

	it("counts D lines as deleted", async () => {
		mockGitOutput("D  removed.ts\n D unstaged-del.ts");
		const result = await getChangeSummary("/fake/path");
		expect(result.deleted).toBe(2);
	});

	it("handles mixed status output correctly", async () => {
		mockGitOutput("?? new.ts\nM  changed.ts\nD  gone.ts\nA  added.ts\n M unstaged.ts");
		const result = await getChangeSummary("/fake/path");
		expect(result).toEqual({ added: 2, modified: 2, deleted: 1, total: 5 });
	});

	it("skips empty or short lines", async () => {
		mockGitOutput("M  file.ts\n\nX");
		const result = await getChangeSummary("/fake/path");
		expect(result.modified).toBe(1);
		expect(result.total).toBe(1);
	});
});
