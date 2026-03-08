import { describe, it, expect } from "vitest";
import { evaluateCondition } from "./executor";
import type { WorkflowContext } from "./interpolate";
import type { Ticket } from "../../shared/types";

function makeContext(overrides: Partial<Ticket> = {}, nodeOutputs: Record<string, unknown> = {}): WorkflowContext {
	return {
		ticket: {
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
		},
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
