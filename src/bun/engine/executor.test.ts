import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateCondition, executeLog, executeSetMetadata, persistNodeOutput, executeNotify } from "./executor";
import type { WorkflowContext } from "./interpolate";
import type { Ticket } from "../../shared/types";

vi.mock("../db/queries/tickets", () => ({
	getTicket: vi.fn(),
	updateTicket: vi.fn(),
	moveTicket: vi.fn(),
}));

vi.mock("../db/queries/runs", () => ({
	insertRunEvent: vi.fn(),
}));

import * as ticketQueries from "../db/queries/tickets";
import * as runQueries from "../db/queries/runs";

const mockDb = {} as any;

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
	return {
		id: "t-1",
		boardId: "b-1",
		laneId: "l-1",
		title: "Bug",
		body: null,
		tags: ["urgent"],
		metadata: { priority: "high" },
		laneEnteredAt: null,
		order: 0,
		createdAt: "2024-01-01",
		updatedAt: "2024-01-01",
		...overrides,
	};
}

function makeContext(overrides: Partial<Ticket> = {}, nodeOutputs: Record<string, unknown> = {}): WorkflowContext {
	return {
		ticket: makeTicket(overrides),
		nodeOutputs,
	};
}

describe("evaluateCondition", () => {
	it("returns true for matching expression", () => {
		expect(evaluateCondition('title === "Bug"', makeContext())).toBe(true);
	});

	it("returns false for non-matching expression", () => {
		expect(evaluateCondition('title === "Feature"', makeContext())).toBe(false);
	});

	it("can access metadata scope", () => {
		expect(evaluateCondition('metadata.priority === "high"', makeContext())).toBe(true);
	});

	it("can access tags scope", () => {
		expect(evaluateCondition('tags.includes("urgent")', makeContext())).toBe(true);
	});

	it("can access outputs scope", () => {
		const ctx = makeContext({}, { step1: "done" });
		expect(evaluateCondition('outputs.step1 === "done"', ctx)).toBe(true);
	});

	it("returns false for malformed expression", () => {
		expect(evaluateCondition("this is not valid js +++", makeContext())).toBe(false);
	});

	it("returns false for empty expression", () => {
		expect(evaluateCondition("", makeContext())).toBe(false);
	});
});

describe("executeLog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("inserts a run event with the interpolated message", () => {
		const ctx = makeContext({ title: "Fix login" });
		executeLog(mockDb, "run-1", "Working on: {{ticketTitle}}", ctx);

		expect(runQueries.insertRunEvent).toHaveBeenCalledOnce();
		const call = vi.mocked(runQueries.insertRunEvent).mock.calls[0];
		expect(call[1].runId).toBe("run-1");
		expect(call[1].type).toBe("NODE_LOG");
		expect(call[1].payload).toEqual({ message: "Working on: Fix login" });
	});

	it("inserts a run event with plain message", () => {
		executeLog(mockDb, "run-2", "hello world", makeContext());

		const call = vi.mocked(runQueries.insertRunEvent).mock.calls[0];
		expect(call[1].payload).toEqual({ message: "hello world" });
	});
});

describe("executeSetMetadata", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("merges new key into existing metadata", () => {
		vi.mocked(ticketQueries.getTicket).mockReturnValue(makeTicket());
		const ctx = makeContext();

		const result = executeSetMetadata(mockDb, "t-1", "status", "reviewed", ctx);

		expect(result).toEqual({ priority: "high", status: "reviewed" });
		expect(ticketQueries.updateTicket).toHaveBeenCalledWith(mockDb, "t-1", {
			metadata: { priority: "high", status: "reviewed" },
		});
	});

	it("overwrites existing metadata key", () => {
		vi.mocked(ticketQueries.getTicket).mockReturnValue(makeTicket());
		const ctx = makeContext();

		const result = executeSetMetadata(mockDb, "t-1", "priority", "low", ctx);

		expect(result.priority).toBe("low");
	});

	it("throws if ticket not found", () => {
		vi.mocked(ticketQueries.getTicket).mockReturnValue(undefined as any);

		expect(() =>
			executeSetMetadata(mockDb, "t-missing", "key", "val", makeContext()),
		).toThrow("Ticket t-missing not found");
	});

	it("interpolates the value before setting", () => {
		vi.mocked(ticketQueries.getTicket).mockReturnValue(makeTicket());
		const ctx = makeContext({ title: "Deploy" });

		const result = executeSetMetadata(mockDb, "t-1", "source", "{{ticketTitle}}", ctx);

		expect(result.source).toBe("Deploy");
	});
});

describe("persistNodeOutput", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("stores output under _workflowOutput in ticket metadata", () => {
		vi.mocked(ticketQueries.getTicket).mockReturnValue(makeTicket());

		persistNodeOutput(mockDb, "t-1", "node-1", "run-1", "some output");

		const call = vi.mocked(ticketQueries.updateTicket).mock.calls[0];
		const meta = call[2].metadata as any;
		expect(meta._workflowOutput["node-1"].output).toBe("some output");
		expect(meta._workflowOutput["node-1"].runId).toBe("run-1");
	});

	it("truncates output to 10,000 characters", () => {
		vi.mocked(ticketQueries.getTicket).mockReturnValue(makeTicket());
		const longOutput = "x".repeat(15_000);

		persistNodeOutput(mockDb, "t-1", "node-1", "run-1", longOutput);

		const call = vi.mocked(ticketQueries.updateTicket).mock.calls[0];
		const meta = call[2].metadata as any;
		expect(meta._workflowOutput["node-1"].output.length).toBe(10_000);
	});

	it("includes status when provided", () => {
		vi.mocked(ticketQueries.getTicket).mockReturnValue(makeTicket());

		persistNodeOutput(mockDb, "t-1", "node-1", "run-1", "done", "success");

		const call = vi.mocked(ticketQueries.updateTicket).mock.calls[0];
		const meta = call[2].metadata as any;
		expect(meta._workflowOutput["node-1"].status).toBe("success");
	});

	it("omits status when not provided", () => {
		vi.mocked(ticketQueries.getTicket).mockReturnValue(makeTicket());

		persistNodeOutput(mockDb, "t-1", "node-1", "run-1", "done");

		const call = vi.mocked(ticketQueries.updateTicket).mock.calls[0];
		const meta = call[2].metadata as any;
		expect(meta._workflowOutput["node-1"].status).toBeUndefined();
	});

	it("does nothing if ticket not found", () => {
		vi.mocked(ticketQueries.getTicket).mockReturnValue(undefined as any);

		persistNodeOutput(mockDb, "t-missing", "node-1", "run-1", "output");

		expect(ticketQueries.updateTicket).not.toHaveBeenCalled();
	});

	it("preserves existing _workflowOutput entries", () => {
		vi.mocked(ticketQueries.getTicket).mockReturnValue(
			makeTicket({ metadata: { _workflowOutput: { "old-node": { output: "old" } } } }),
		);

		persistNodeOutput(mockDb, "t-1", "new-node", "run-1", "new output");

		const call = vi.mocked(ticketQueries.updateTicket).mock.calls[0];
		const meta = call[2].metadata as any;
		expect(meta._workflowOutput["old-node"]).toEqual({ output: "old" });
		expect(meta._workflowOutput["new-node"].output).toBe("new output");
	});
});

describe("executeNotify", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("Bun", { spawn: vi.fn() });
	});

	it("escapes backslashes and quotes in title and body", () => {
		const ctx = makeContext();
		executeNotify(mockDb, "run-1", 'Say "hello"', 'Path: C:\\Users\\test', ctx);

		const spawnCall = vi.mocked(Bun.spawn).mock.calls[0];
		const script = spawnCall[0][2] as string;
		expect(script).toContain('Say \\"hello\\"');
		expect(script).toContain("C:\\\\Users\\\\test");
	});

	it("inserts a NODE_NOTIFY run event", () => {
		const ctx = makeContext();
		executeNotify(mockDb, "run-1", "Title", "Body", ctx);

		const call = vi.mocked(runQueries.insertRunEvent).mock.calls[0];
		expect(call[1].type).toBe("NODE_NOTIFY");
		expect(call[1].payload).toEqual({ title: "Title", body: "Body" });
	});
});
