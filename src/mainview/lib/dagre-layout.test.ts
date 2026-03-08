import { describe, it, expect } from "vitest";
import { applyDagreLayout } from "./dagre-layout";
import type { Node, Edge } from "@xyflow/react";

function node(id: string): Node {
	return { id, type: "default", position: { x: 0, y: 0 }, data: {} };
}

function edge(source: string, target: string): Edge {
	return { id: `${source}-${target}`, source, target };
}

describe("applyDagreLayout", () => {
	it("returns a position for a single node", () => {
		const result = applyDagreLayout([node("a")], []);
		expect(result).toHaveLength(1);
		expect(result[0].position).toHaveProperty("x");
		expect(result[0].position).toHaveProperty("y");
	});

	it("orders a linear chain top-to-bottom", () => {
		const nodes = [node("a"), node("b"), node("c")];
		const edges = [edge("a", "b"), edge("b", "c")];
		const result = applyDagreLayout(nodes, edges);

		const yA = result.find((n) => n.id === "a")!.position.y;
		const yB = result.find((n) => n.id === "b")!.position.y;
		const yC = result.find((n) => n.id === "c")!.position.y;
		expect(yA).toBeLessThan(yB);
		expect(yB).toBeLessThan(yC);
	});

	it("gives parallel branches distinct x positions", () => {
		const nodes = [node("root"), node("left"), node("right")];
		const edges = [edge("root", "left"), edge("root", "right")];
		const result = applyDagreLayout(nodes, edges);

		const xLeft = result.find((n) => n.id === "left")!.position.x;
		const xRight = result.find((n) => n.id === "right")!.position.x;
		expect(xLeft).not.toBe(xRight);
	});

	it("handles empty input without error", () => {
		const result = applyDagreLayout([], []);
		expect(result).toEqual([]);
	});
});
