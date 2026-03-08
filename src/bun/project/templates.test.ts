import { describe, it, expect } from "vitest";
import { remapMoveToLaneNodes, deleteTemplate } from "./templates";
import type { WorkflowIR } from "../../shared/types";

describe("remapMoveToLaneNodes", () => {
	const baseIR: WorkflowIR = {
		version: 1,
		nodes: [
			{ id: "s", type: "start", position: { x: 0, y: 0 }, config: { type: "start" } },
			{
				id: "m1",
				type: "moveToLane",
				position: { x: 0, y: 100 },
				config: { type: "moveToLane", laneId: "", laneName: "Done" },
			},
			{ id: "e", type: "end", position: { x: 0, y: 200 }, config: { type: "end" } },
		],
		edges: [],
	};

	it("remaps moveToLane node laneId from name map", () => {
		const map = new Map([["Done", "lane-123"]]);
		const result = remapMoveToLaneNodes(baseIR, map);
		const moveNode = result.nodes.find((n) => n.type === "moveToLane")!;
		expect((moveNode.config as any).laneId).toBe("lane-123");
	});

	it("leaves non-moveToLane nodes unchanged", () => {
		const map = new Map([["Done", "lane-123"]]);
		const result = remapMoveToLaneNodes(baseIR, map);
		const startNode = result.nodes.find((n) => n.type === "start")!;
		expect(startNode).toEqual(baseIR.nodes[0]);
	});

	it("maps to empty string when lane name not in map", () => {
		const result = remapMoveToLaneNodes(baseIR, new Map());
		const moveNode = result.nodes.find((n) => n.type === "moveToLane")!;
		expect((moveNode.config as any).laneId).toBe("");
	});

	it("remaps multiple moveToLane nodes", () => {
		const ir: WorkflowIR = {
			version: 1,
			nodes: [
				{ id: "m1", type: "moveToLane", position: { x: 0, y: 0 }, config: { type: "moveToLane", laneId: "", laneName: "A" } },
				{ id: "m2", type: "moveToLane", position: { x: 0, y: 100 }, config: { type: "moveToLane", laneId: "", laneName: "B" } },
			],
			edges: [],
		};
		const map = new Map([["A", "id-a"], ["B", "id-b"]]);
		const result = remapMoveToLaneNodes(ir, map);
		expect((result.nodes[0].config as any).laneId).toBe("id-a");
		expect((result.nodes[1].config as any).laneId).toBe("id-b");
	});
});

describe("deleteTemplate", () => {
	it("throws error for builtin template ID", () => {
		expect(() => deleteTemplate("builtin-simple-kanban")).toThrow("Cannot delete built-in templates");
	});
});
