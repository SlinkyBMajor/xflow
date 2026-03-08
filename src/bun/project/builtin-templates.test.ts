import { describe, it, expect } from "vitest";
import { BUILTIN_TEMPLATES } from "./builtin-templates";
import { validateIR } from "../../mainview/lib/workflow-ir";

describe("BUILTIN_TEMPLATES", () => {
	it("all templates have required fields", () => {
		for (const t of BUILTIN_TEMPLATES) {
			expect(t.id).toBeTruthy();
			expect(t.name).toBeTruthy();
			expect(t.version).toBe(1);
			expect(t.lanes.length).toBeGreaterThan(0);
			expect(t.createdAt).toBeTruthy();
		}
	});

	it("all template IDs start with builtin-", () => {
		for (const t of BUILTIN_TEMPLATES) {
			expect(t.id).toMatch(/^builtin-/);
		}
	});

	it("all lane workflows pass validateIR", () => {
		for (const t of BUILTIN_TEMPLATES) {
			for (const lane of t.lanes) {
				if (lane.workflow) {
					const result = validateIR(lane.workflow);
					expect(result.valid, `Template "${t.name}", lane "${lane.name}": ${result.errors.join(", ")}`).toBe(true);
				}
			}
		}
	});
});
