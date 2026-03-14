import { describe, it, expect } from "vitest";
import { parseAndValidateIR } from "./validate-ir";

function makeMinimalIR(overrides?: Record<string, unknown>) {
	return {
		version: 1,
		nodes: [
			{ id: "n1", type: "start", position: { x: 0, y: 0 }, config: { type: "start" } },
			{ id: "n2", type: "end", position: { x: 100, y: 0 }, config: { type: "end" } },
		],
		edges: [{ id: "e1", from: "n1", to: "n2" }],
		...overrides,
	};
}

describe("parseAndValidateIR", () => {
	it("accepts a valid complete IR", () => {
		const result = parseAndValidateIR(makeMinimalIR());
		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
		expect(result.ir).toBeDefined();
	});

	it("rejects null input", () => {
		const result = parseAndValidateIR(null);
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it("rejects a string input", () => {
		const result = parseAndValidateIR("not an object");
		expect(result.valid).toBe(false);
	});

	it("rejects a number input", () => {
		const result = parseAndValidateIR(42);
		expect(result.valid).toBe(false);
	});

	it("rejects missing version", () => {
		const result = parseAndValidateIR({ nodes: [], edges: [] });
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => /version/i.test(e))).toBe(true);
	});

	it("rejects wrong version", () => {
		const result = parseAndValidateIR(makeMinimalIR({ version: 2 }));
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => /version/i.test(e))).toBe(true);
	});

	it("rejects non-array nodes", () => {
		const result = parseAndValidateIR({ version: 1, nodes: "not-array", edges: [] });
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => /nodes/i.test(e))).toBe(true);
	});

	it("rejects non-array edges", () => {
		const result = parseAndValidateIR({ version: 1, nodes: [], edges: "bad" });
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => /edges/i.test(e))).toBe(true);
	});

	it("rejects a node with invalid type", () => {
		const ir = makeMinimalIR();
		(ir.nodes as Record<string, unknown>[])[0].type = "bogus";
		(ir.nodes as Record<string, unknown>[])[0].config = { type: "bogus" };
		const result = parseAndValidateIR(ir);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => /nodes\[0\]/i.test(e))).toBe(true);
	});

	it("rejects a node with missing position", () => {
		const ir = makeMinimalIR();
		delete (ir.nodes as Record<string, unknown>[])[0].position;
		const result = parseAndValidateIR(ir);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => /position/i.test(e))).toBe(true);
	});

	it("rejects a node with non-numeric position coordinates", () => {
		const ir = makeMinimalIR();
		(ir.nodes as Record<string, unknown>[])[0].position = { x: "a", y: 0 };
		const result = parseAndValidateIR(ir);
		expect(result.valid).toBe(false);
	});

	it("rejects a node with missing required config fields", () => {
		const ir = makeMinimalIR();
		ir.nodes.push({
			id: "n3",
			type: "claudeAgent",
			position: { x: 200, y: 0 },
			config: { type: "claudeAgent" } as never, // missing prompt
		});
		ir.edges.push({ id: "e2", from: "n1", to: "n3" });
		const result = parseAndValidateIR(ir);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => /prompt/i.test(e))).toBe(true);
	});

	it("rejects an edge missing from", () => {
		const ir = makeMinimalIR();
		delete (ir.edges as Record<string, unknown>[])[0].from;
		const result = parseAndValidateIR(ir);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => /from/i.test(e))).toBe(true);
	});

	it("rejects an edge missing to", () => {
		const ir = makeMinimalIR();
		delete (ir.edges as Record<string, unknown>[])[0].to;
		const result = parseAndValidateIR(ir);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => /to/i.test(e))).toBe(true);
	});

	it("runs graph-level checks after structural pass", () => {
		// Valid structure but no start node
		const ir = {
			version: 1,
			nodes: [{ id: "n1", type: "end", position: { x: 0, y: 0 }, config: { type: "end" } }],
			edges: [],
		};
		const result = parseAndValidateIR(ir);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => /Entry node/i.test(e))).toBe(true);
	});

	it("reports dangling edge references", () => {
		const ir = makeMinimalIR();
		ir.edges.push({ id: "e2", from: "n1", to: "nonexistent" });
		const result = parseAndValidateIR(ir);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => /nonexistent/i.test(e))).toBe(true);
	});

	it("accepts a claudeAgent node with all optional fields", () => {
		const ir = makeMinimalIR();
		ir.nodes.splice(1, 0, {
			id: "n3",
			type: "claudeAgent",
			position: { x: 50, y: 0 },
			config: {
				type: "claudeAgent",
				prompt: "Do something",
				timeoutMs: 30000,
				model: "opus",
				maxTurns: 10,
				systemPrompt: "You are helpful",
				skipPermissions: true,
				allowedToolsPreset: "full",
				allowedToolsCustom: "Read,Write",
				includeWorkflowOutput: true,
				worktreeEnabled: false,
				outputLabel: "Agent output",
			} as never,
		});
		ir.edges[0] = { id: "e1", from: "n1", to: "n3" };
		ir.edges.push({ id: "e2", from: "n3", to: "n2" });
		const result = parseAndValidateIR(ir);
		expect(result.valid).toBe(true);
	});

	it("accepts a gitAction node with valid config", () => {
		const ir = makeMinimalIR();
		ir.nodes.splice(1, 0, {
			id: "n3",
			type: "gitAction",
			position: { x: 50, y: 0 },
			config: {
				type: "gitAction",
				action: "createPr",
				baseBranch: "main",
				prTitle: "My PR",
			} as never,
		});
		ir.edges[0] = { id: "e1", from: "n1", to: "n3" };
		ir.edges.push({ id: "e2", from: "n3", to: "n2" });
		const result = parseAndValidateIR(ir);
		expect(result.valid).toBe(true);
	});

	it("rejects a gitAction node with invalid action", () => {
		const ir = makeMinimalIR();
		ir.nodes.splice(1, 0, {
			id: "n3",
			type: "gitAction",
			position: { x: 50, y: 0 },
			config: { type: "gitAction", action: "invalid" } as never,
		});
		ir.edges[0] = { id: "e1", from: "n1", to: "n3" };
		ir.edges.push({ id: "e2", from: "n3", to: "n2" });
		const result = parseAndValidateIR(ir);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => /action/i.test(e))).toBe(true);
	});

	it("tolerates unknown extra fields on node configs (passthrough)", () => {
		const ir = makeMinimalIR();
		(ir.nodes[0].config as Record<string, unknown>).extraField = "hello";
		const result = parseAndValidateIR(ir);
		expect(result.valid).toBe(true);
	});
});
