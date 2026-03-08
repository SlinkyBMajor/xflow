import { describe, it, expect } from "vitest";
import { SHORTCUT_REGISTRY, getShortcutsByGroup } from "./shortcut-registry";

describe("getShortcutsByGroup", () => {
	it("groups shortcuts by their group field", () => {
		const groups = getShortcutsByGroup();
		expect(Object.keys(groups).length).toBeGreaterThan(0);

		for (const [groupName, shortcuts] of Object.entries(groups)) {
			for (const s of shortcuts) {
				expect(s.group).toBe(groupName);
			}
		}
	});

	it("includes every registry shortcut in exactly one group", () => {
		const groups = getShortcutsByGroup();
		const allGrouped = Object.values(groups).flat();
		expect(allGrouped).toHaveLength(SHORTCUT_REGISTRY.length);
	});
});

describe("SHORTCUT_REGISTRY integrity", () => {
	it("has no duplicate IDs", () => {
		const ids = SHORTCUT_REGISTRY.map((s) => s.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("has no duplicate keys within the same group", () => {
		const groups = getShortcutsByGroup();
		for (const [, shortcuts] of Object.entries(groups)) {
			const keys = shortcuts.map((s) => s.keys);
			expect(new Set(keys).size).toBe(keys.length);
		}
	});
});
