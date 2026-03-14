import { describe, it, expect, vi } from "vitest";
import type { WorkflowIR, IRNode, Ticket } from "../../shared/types";

vi.mock("./executor", () => ({
	executeLog: vi.fn(),
	executeSetMetadata: vi.fn(),
	executeNotify: vi.fn(),
	evaluateCondition: vi.fn(),
	persistNodeOutput: vi.fn(),
}));

vi.mock("./agent", () => ({
	executeClaudeAgent: vi.fn(),
}));

vi.mock("./script", () => ({
	executeCustomScript: vi.fn(),
}));

vi.mock("./lane-transition", () => ({
	transitionTicketToLane: vi.fn(),
}));

import { compileWorkflow } from "./compiler";

const mockDb = {} as any;
const mockNotify = vi.fn();

function makeTicket(): Ticket {
	return {
		id: "t-1",
		boardId: "b-1",
		laneId: "l-1",
		title: "Test",
		body: null,
		tags: [],
		metadata: {},
		laneEnteredAt: null,
		order: 0,
		createdAt: "2024-01-01",
		updatedAt: "2024-01-01",
	};
}

function makeIR(nodes: IRNode[], edges: { from: string; to: string; on?: string }[] = []): WorkflowIR {
	return { nodes, edges };
}

describe("compileWorkflow", () => {
	it("throws if no start node exists", () => {
		const ir = makeIR([{ id: "end-1", type: "end", config: { type: "end" } }]);
		expect(() =>
			compileWorkflow(ir, makeTicket(), "run-1", mockDb, mockNotify),
		).toThrow("Workflow IR missing start node");
	});

	it("creates a machine with start node as initial state", () => {
		const ir = makeIR(
			[
				{ id: "s", type: "start", config: { type: "start" } },
				{ id: "e", type: "end", config: { type: "end" } },
			],
			[{ from: "s", to: "e" }],
		);

		const machine = compileWorkflow(ir, makeTicket(), "run-1", mockDb, mockNotify);

		expect(machine.config.initial).toBe("s");
	});

	it("start node transitions to first target via always", () => {
		const ir = makeIR(
			[
				{ id: "s", type: "start", config: { type: "start" } },
				{ id: "e", type: "end", config: { type: "end" } },
			],
			[{ from: "s", to: "e" }],
		);

		const machine = compileWorkflow(ir, makeTicket(), "run-1", mockDb, mockNotify);
		const states = machine.config.states as any;

		expect(states.s.always).toEqual({ target: "e" });
	});

	it("end node produces a final state", () => {
		const ir = makeIR(
			[
				{ id: "s", type: "start", config: { type: "start" } },
				{ id: "e", type: "end", config: { type: "end" } },
			],
			[{ from: "s", to: "e" }],
		);

		const machine = compileWorkflow(ir, makeTicket(), "run-1", mockDb, mockNotify);
		const states = machine.config.states as any;

		expect(states.e.type).toBe("final");
	});

	it("waitForApproval node produces event-driven transitions", () => {
		const ir = makeIR(
			[
				{ id: "s", type: "start", config: { type: "start" } },
				{ id: "w", type: "waitForApproval", config: { type: "waitForApproval" } },
				{ id: "approved", type: "end", config: { type: "end" } },
				{ id: "rejected", type: "end", config: { type: "end" } },
			],
			[
				{ from: "s", to: "w" },
				{ from: "w", to: "approved", on: "APPROVED" },
				{ from: "w", to: "rejected", on: "REJECTED" },
			],
		);

		const machine = compileWorkflow(ir, makeTicket(), "run-1", mockDb, mockNotify);
		const states = machine.config.states as any;

		expect(states.w.on.APPROVED).toEqual({ target: "approved" });
		expect(states.w.on.REJECTED).toEqual({ target: "rejected" });
	});

	it("condition node wires TRUE/FALSE edges", () => {
		const ir = makeIR(
			[
				{ id: "s", type: "start", config: { type: "start" } },
				{ id: "c", type: "condition", config: { type: "condition", expression: "true" } },
				{ id: "yes", type: "end", config: { type: "end" } },
				{ id: "no", type: "end", config: { type: "end" } },
			],
			[
				{ from: "s", to: "c" },
				{ from: "c", to: "yes", on: "TRUE" },
				{ from: "c", to: "no", on: "FALSE" },
			],
		);

		const machine = compileWorkflow(ir, makeTicket(), "run-1", mockDb, mockNotify);
		const states = machine.config.states as any;

		expect(states.c.always).toHaveLength(2);
		expect(states.c.always[0].target).toBe("yes");
		expect(states.c.always[1].target).toBe("no");
		expect(typeof states.c.always[0].guard).toBe("function");
		expect(typeof states.c.always[1].guard).toBe("function");
	});

	it("log node has entry action and auto-transitions", () => {
		const ir = makeIR(
			[
				{ id: "s", type: "start", config: { type: "start" } },
				{ id: "log1", type: "log", config: { type: "log", message: "hello" } },
				{ id: "e", type: "end", config: { type: "end" } },
			],
			[
				{ from: "s", to: "log1" },
				{ from: "log1", to: "e" },
			],
		);

		const machine = compileWorkflow(ir, makeTicket(), "run-1", mockDb, mockNotify);
		const states = machine.config.states as any;

		expect(typeof states.log1.entry).toBe("function");
		expect(states.log1.always).toEqual({ target: "e" });
	});

	it("uses initialNodeId when provided", () => {
		const ir = makeIR(
			[
				{ id: "s", type: "start", config: { type: "start" } },
				{ id: "mid", type: "log", config: { type: "log", message: "hi" } },
				{ id: "e", type: "end", config: { type: "end" } },
			],
			[
				{ from: "s", to: "mid" },
				{ from: "mid", to: "e" },
			],
		);

		const machine = compileWorkflow(ir, makeTicket(), "run-1", mockDb, mockNotify, "mid");

		expect(machine.config.initial).toBe("mid");
	});

	it("unknown node type auto-transitions like default", () => {
		const ir = makeIR(
			[
				{ id: "s", type: "start", config: { type: "start" } },
				{ id: "x", type: "unknownType" as any, config: { type: "unknownType" as any } },
				{ id: "e", type: "end", config: { type: "end" } },
			],
			[
				{ from: "s", to: "x" },
				{ from: "x", to: "e" },
			],
		);

		const machine = compileWorkflow(ir, makeTicket(), "run-1", mockDb, mockNotify);
		const states = machine.config.states as any;

		expect(states.x.always).toEqual({ target: "e" });
	});
});
