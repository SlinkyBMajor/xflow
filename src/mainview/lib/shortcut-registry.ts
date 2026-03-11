export interface Shortcut {
	id: string;
	label: string;
	keys: string;
	group: string;
	description?: string;
}

export const SHORTCUT_REGISTRY: Shortcut[] = [
	// ── Global ──────────────────────────────────────────
	{
		id: "view-board",
		label: "Board view",
		keys: "⌘1",
		group: "Global",
	},
	{
		id: "view-workflows",
		label: "Workflows view",
		keys: "⌘2",
		group: "Global",
	},

	// ── Workflow Editor ─────────────────────────────────
	{
		id: "workflow-save",
		label: "Save workflow",
		keys: "⌘S",
		group: "Workflow Editor",
	},
	{
		id: "workflow-version-history",
		label: "Version history",
		keys: "⌘⇧H",
		group: "Workflow Editor",
	},
	{
		id: "workflow-node-reference",
		label: "Node reference",
		keys: "⌘⇧N",
		group: "Workflow Editor",
	},
	{
		id: "workflow-ai-assistant",
		label: "AI workflow assistant",
		keys: "⌘⇧A",
		group: "Workflow Editor",
	},

	// ── Kanban ──────────────────────────────────────────
	{
		id: "board-templates",
		label: "Board templates",
		keys: "⌘⇧T",
		group: "Kanban",
	},
	{
		id: "toggle-agent-panel",
		label: "Toggle agent panel",
		keys: "⌘J",
		group: "Kanban",
	},
];

export function getShortcutsByGroup(): Record<string, Shortcut[]> {
	const groups: Record<string, Shortcut[]> = {};
	for (const shortcut of SHORTCUT_REGISTRY) {
		if (!groups[shortcut.group]) groups[shortcut.group] = [];
		groups[shortcut.group].push(shortcut);
	}
	return groups;
}
