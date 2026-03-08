import { describe, it, expect } from "vitest";
import { interpolate, type WorkflowContext } from "./interpolate";
import type { Ticket } from "../../shared/types";

function makeContext(overrides: Partial<Ticket> = {}, nodeOutputs: Record<string, unknown> = {}): WorkflowContext {
	return {
		ticket: {
			id: "t-1",
			boardId: "b-1",
			laneId: "l-1",
			title: "Fix bug",
			body: null,
			tags: [],
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

describe("interpolate", () => {
	it("substitutes {{ticketTitle}}", () => {
		expect(interpolate("Task: {{ticketTitle}}", makeContext())).toBe("Task: Fix bug");
	});

	it("substitutes {{ticketId}}", () => {
		expect(interpolate("ID: {{ticketId}}", makeContext())).toBe("ID: t-1");
	});

	it("substitutes {{ticketLaneId}}", () => {
		expect(interpolate("Lane: {{ticketLaneId}}", makeContext())).toBe("Lane: l-1");
	});

	it("reads {{ticketMetadata.someKey}}", () => {
		expect(interpolate("{{ticketMetadata.priority}}", makeContext())).toBe("high");
	});

	it("returns empty string for missing metadata key", () => {
		expect(interpolate("{{ticketMetadata.missing}}", makeContext())).toBe("");
	});

	it("reads {{nodeOutputs.step1}}", () => {
		const ctx = makeContext({}, { step1: "result" });
		expect(interpolate("{{nodeOutputs.step1}}", ctx)).toBe("result");
	});

	it("returns empty string for missing node output", () => {
		expect(interpolate("{{nodeOutputs.missing}}", makeContext())).toBe("");
	});

	it("returns empty string for unknown tokens", () => {
		expect(interpolate("{{unknown}}", makeContext())).toBe("");
	});

	it("substitutes multiple placeholders in one string", () => {
		const result = interpolate("[{{ticketId}}] {{ticketTitle}}", makeContext());
		expect(result).toBe("[t-1] Fix bug");
	});

	it("returns template unchanged when no placeholders", () => {
		expect(interpolate("plain text", makeContext())).toBe("plain text");
	});

	it("trims whitespace in keys", () => {
		expect(interpolate("{{ ticketTitle }}", makeContext())).toBe("Fix bug");
	});
});
