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
			body: "Some body text",
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
	it("substitutes {{ticket.title}}", () => {
		expect(interpolate("Task: {{ticket.title}}", makeContext())).toBe("Task: Fix bug");
	});

	it("substitutes {{ticket.id}}", () => {
		expect(interpolate("ID: {{ticket.id}}", makeContext())).toBe("ID: t-1");
	});

	it("substitutes {{ticket.laneId}}", () => {
		expect(interpolate("Lane: {{ticket.laneId}}", makeContext())).toBe("Lane: l-1");
	});

	it("substitutes {{ticket.body}}", () => {
		expect(interpolate("Body: {{ticket.body}}", makeContext())).toBe("Body: Some body text");
	});

	it("returns empty string for null body", () => {
		expect(interpolate("Body: {{ticket.body}}", makeContext({ body: null }))).toBe("Body: ");
	});

	it("reads {{ticket.metadata.someKey}}", () => {
		expect(interpolate("{{ticket.metadata.priority}}", makeContext())).toBe("high");
	});

	it("throws for missing metadata key", () => {
		expect(() => interpolate("{{ticket.metadata.missing}}", makeContext())).toThrow(
			'key "missing" not found in ticket metadata',
		);
	});

	it("reads {{outputs.step1}} from raw string", () => {
		const ctx = makeContext({}, { step1: "result" });
		expect(interpolate("{{outputs.step1}}", ctx)).toBe("result");
	});

	it("unwraps NodeResult for {{outputs.step1}}", () => {
		const ctx = makeContext({}, { step1: { status: "success", output: "agent result" } });
		expect(interpolate("{{outputs.step1}}", ctx)).toBe("agent result");
	});

	it("throws for missing node output", () => {
		expect(() => interpolate("{{outputs.missing}}", makeContext())).toThrow(
			'no output found for node "missing"',
		);
	});

	it("throws for unknown tokens", () => {
		expect(() => interpolate("{{unknown}}", makeContext())).toThrow("unknown variable pattern");
	});

	it("substitutes multiple placeholders in one string", () => {
		const result = interpolate("[{{ticket.id}}] {{ticket.title}}", makeContext());
		expect(result).toBe("[t-1] Fix bug");
	});

	it("returns template unchanged when no placeholders", () => {
		expect(interpolate("plain text", makeContext())).toBe("plain text");
	});

	it("trims whitespace in keys", () => {
		expect(interpolate("{{ ticket.title }}", makeContext())).toBe("Fix bug");
	});
});
