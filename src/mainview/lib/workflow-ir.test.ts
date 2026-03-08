import { describe, it, expect } from "vitest";
import {
	validateIR,
	irToReactFlow,
	reactFlowToIR,
	createDefaultIR,
	getDefaultConfig,
	getNodeLabel,
} from "./workflow-ir";
import type { WorkflowIR, IRNodeType } from "../../shared/types";

function makeIR(overrides: Partial<WorkflowIR> = {}): WorkflowIR {
	return {
		version: 1,
		nodes: [
			{ id: "s", type: "start", position: { x: 0, y: 0 }, config: { type: "start" } },
			{ id: "e", type: "end", position: { x: 0, y: 100 }, config: { type: "end" } },
		],
		edges: [{ id: "e1", from: "s", to: "e" }],
		...overrides,
	};
}

describe("validateIR", () => {
	it("accepts a valid workflow with 1 start and 1 end", () => {
		const result = validateIR(makeIR());
		expect(result).toEqual({ valid: true, errors: [] });
	});

	it("rejects missing start node", () => {
		const ir = makeIR({
			nodes: [{ id: "e", type: "end", position: { x: 0, y: 0 }, config: { type: "end" } }],
			edges: [],
		});
		expect(validateIR(ir).valid).toBe(false);
		expect(validateIR(ir).errors).toContain("Workflow must have exactly one Entry node");
	});

	it("rejects multiple start nodes", () => {
		const ir = makeIR({
			nodes: [
				{ id: "s1", type: "start", position: { x: 0, y: 0 }, config: { type: "start" } },
				{ id: "s2", type: "start", position: { x: 100, y: 0 }, config: { type: "start" } },
				{ id: "e", type: "end", position: { x: 0, y: 100 }, config: { type: "end" } },
			],
		});
		expect(validateIR(ir).valid).toBe(false);
		expect(validateIR(ir).errors).toContain("Workflow must have exactly one Entry node");
	});

	it("rejects missing end node", () => {
		const ir = makeIR({
			nodes: [{ id: "s", type: "start", position: { x: 0, y: 0 }, config: { type: "start" } }],
			edges: [],
		});
		expect(validateIR(ir).valid).toBe(false);
		expect(validateIR(ir).errors).toContain("Workflow must have at least one End node");
	});

	it("reports dangling edge with bad source", () => {
		const ir = makeIR({
			edges: [{ id: "e1", from: "ghost", to: "e" }],
		});
		const result = validateIR(ir);
		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain("unknown source node");
	});

	it("reports dangling edge with bad target", () => {
		const ir = makeIR({
			edges: [{ id: "e1", from: "s", to: "ghost" }],
		});
		const result = validateIR(ir);
		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain("unknown target node");
	});

	it("returns all errors at once", () => {
		const ir: WorkflowIR = { version: 1, nodes: [], edges: [{ id: "e1", from: "a", to: "b" }] };
		const result = validateIR(ir);
		expect(result.errors.length).toBeGreaterThanOrEqual(3);
	});
});

describe("irToReactFlow", () => {
	it("maps IR nodes and edges to ReactFlow format", () => {
		const ir = makeIR();
		const { nodes, edges } = irToReactFlow(ir);

		expect(nodes).toHaveLength(2);
		expect(nodes[0]).toMatchObject({ id: "s", type: "start", position: { x: 0, y: 0 } });
		expect(nodes[0].data.label).toBe("Entry");

		expect(edges).toHaveLength(1);
		expect(edges[0]).toMatchObject({ source: "s", target: "e", type: "smoothstep" });
	});
});

describe("reactFlowToIR", () => {
	it("converts back to IR with version 1", () => {
		const rfNodes = [
			{ id: "s", type: "start", position: { x: 0, y: 0 }, data: { label: "Entry", config: { type: "start" } } },
			{ id: "e", type: "end", position: { x: 0, y: 100 }, data: { label: "End", config: { type: "end" } } },
		];
		const rfEdges = [{ id: "e1", source: "s", target: "e" }];

		const ir = reactFlowToIR(rfNodes as any, rfEdges as any);
		expect(ir.version).toBe(1);
		expect(ir.nodes).toHaveLength(2);
		expect(ir.edges[0]).toMatchObject({ from: "s", to: "e" });
	});
});

describe("irToReactFlow → reactFlowToIR round-trip", () => {
	it("preserves structure", () => {
		const original = makeIR();
		const { nodes, edges } = irToReactFlow(original);
		const roundTripped = reactFlowToIR(nodes, edges);

		expect(roundTripped.version).toBe(1);
		expect(roundTripped.nodes).toHaveLength(original.nodes.length);
		expect(roundTripped.edges).toHaveLength(original.edges.length);
		expect(roundTripped.edges[0].from).toBe(original.edges[0].from);
		expect(roundTripped.edges[0].to).toBe(original.edges[0].to);
	});
});

describe("createDefaultIR", () => {
	it("returns 1 start + 1 end node, 0 edges, version 1", () => {
		const ir = createDefaultIR();
		expect(ir.version).toBe(1);
		expect(ir.nodes).toHaveLength(2);
		expect(ir.nodes[0].type).toBe("start");
		expect(ir.nodes[1].type).toBe("end");
		expect(ir.edges).toHaveLength(0);
	});
});

describe("getDefaultConfig", () => {
	it("returns correct config for each node type", () => {
		expect(getDefaultConfig("start")).toEqual({ type: "start" });
		expect(getDefaultConfig("end")).toEqual({ type: "end" });

		const claude = getDefaultConfig("claudeAgent");
		expect(claude).toMatchObject({ type: "claudeAgent", timeoutMs: 600000 });

		const script = getDefaultConfig("customScript");
		expect(script).toMatchObject({ type: "customScript", interpreter: "bun", timeoutMs: 30000 });

		expect(getDefaultConfig("notify")).toMatchObject({ type: "notify", title: "", body: "" });
		expect(getDefaultConfig("waitForApproval")).toMatchObject({ type: "waitForApproval", message: "" });
		expect(getDefaultConfig("moveToLane")).toMatchObject({ type: "moveToLane", laneId: "" });
		expect(getDefaultConfig("condition")).toMatchObject({ type: "condition", expression: "" });
		expect(getDefaultConfig("setMetadata")).toMatchObject({ type: "setMetadata", key: "", value: "" });
		expect(getDefaultConfig("log")).toMatchObject({ type: "log", message: "" });
	});
});

describe("getNodeLabel", () => {
	const expected: [IRNodeType, string][] = [
		["start", "Entry"],
		["end", "End"],
		["claudeAgent", "Claude Agent"],
		["customScript", "Custom Script"],
		["notify", "Notify"],
		["waitForApproval", "Wait for Approval"],
		["moveToLane", "Move to Lane"],
		["condition", "Condition"],
		["setMetadata", "Set Metadata"],
		["log", "Log"],
	];

	for (const [type, label] of expected) {
		it(`returns "${label}" for "${type}"`, () => {
			expect(getNodeLabel(type)).toBe(label);
		});
	}
});
