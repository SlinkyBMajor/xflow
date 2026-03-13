import type { IRNodeType } from "./types";

export interface NodeRegistryItem {
	type: IRNodeType;
	color: string;
	label: string;
	description: string;
	config: string[];
	events?: string[];
}

export interface NodeRegistryGroup {
	label: string;
	items: NodeRegistryItem[];
}

export const NODE_REGISTRY: NodeRegistryGroup[] = [
	{
		label: "Flow Control",
		items: [
			{
				type: "start",
				color: "#22c55e",
				label: "Entry",
				description:
					"Entry point of every workflow. Receives the ticket context (title, description, metadata) and passes it downstream. Every workflow must have exactly one Start node.",
				config: [],
			},
			{
				type: "end",
				color: "#ef4444",
				label: "End",
				description:
					"Terminal node that marks the run as complete. A workflow must have at least one End node. Multiple End nodes are allowed for different completion paths.",
				config: [],
			},
			{
				type: "condition",
				color: "#eab308",
				label: "Condition",
				description:
					"Routes the flow along one of two edges based on evaluating an expression against the ticket context and prior node outputs.",
				config: ["expression — expression evaluated at runtime"],
				events: ["TRUE", "FALSE"],
			},
		],
	},
	{
		label: "Actions",
		items: [
			{
				type: "claudeAgent",
				color: "#8b5cf6",
				label: "Claude Agent",
				description:
					"Spawns a Claude Code CLI process with the project root as the working directory. The ticket context is passed as input; agent output is captured.",
				config: [
					"prompt — instruction prepended to the ticket context",
					"timeoutMs — max execution time (default: 600s)",
					"includeWorkflowOutput — include output from prior nodes",
					"outputLabel — label for this agent's output",
					"worktreeEnabled — run in an isolated git worktree",
				],
				events: ["AGENT_DONE"],
			},
			{
				type: "customScript",
				color: "#f59e0b",
				label: "Custom Script",
				description: "Runs an arbitrary script in the project root.",
				config: [
					"script — the script body to execute",
					'interpreter — "bun" or "sh" (default: bun)',
					"timeoutMs — max execution time (default: 30s)",
				],
			},
			{
				type: "moveToLane",
				color: "#3b82f6",
				label: "Move to Lane",
				description:
					"Advances the ticket to a different lane on the board. If the destination lane has its own workflow, that workflow is triggered in turn.",
				config: ["laneId — target lane"],
			},
			{
				type: "setMetadata",
				color: "#10b981",
				label: "Set Metadata",
				description:
					"Writes a key-value pair onto the ticket's metadata. Useful for passing data between nodes or tagging tickets with computed values.",
				config: [
					"key — metadata key",
					"value — metadata value (supports {{agentOutput}} interpolation)",
				],
			},
			{
				type: "log",
				color: "#71717a",
				label: "Log",
				description:
					"Appends a message to the ticket's run history. Useful for debugging and audit trails.",
				config: ["message — the message to log"],
			},
			{
				type: "gitAction",
				color: "#f472b6",
				label: "Git Action",
				description:
					"Performs Git/GitHub operations: create a PR, add a reviewer, or merge a PR. Composable with other nodes for multi-step Git workflows.",
				config: [
					"action — createPr, addReviewer, or mergePr",
					"baseBranch — target branch for PR (createPr)",
					"prTitle — PR title (createPr, supports interpolation)",
					"prBody — PR body (createPr, supports interpolation)",
					"reviewer — GitHub username to add (addReviewer)",
					"prNumber — PR number (addReviewer/mergePr, supports interpolation)",
					"mergeMethod — squash, merge, or rebase (mergePr)",
				],
				events: ["GIT_ACTION_PR_CREATED", "GIT_ACTION_REVIEWER_ADDED", "GIT_ACTION_PR_MERGED"],
			},
		],
	},
	{
		label: "Interactions",
		items: [
			{
				type: "notify",
				color: "#06b6d4",
				label: "Notify",
				description: "Sends a native desktop notification via Electrobun.",
				config: [
					"title — notification title (supports {{ticket.title}} interpolation)",
					"body — notification body",
				],
			},
			{
				type: "waitForApproval",
				color: "#f97316",
				label: "Wait for Approval",
				description:
					"Pauses the workflow and surfaces an approve/reject action in the ticket detail UI. On app restart, waiting nodes are automatically restored.",
				config: ["message — prompt shown to the reviewer"],
				events: ["APPROVED", "REJECTED"],
			},
		],
	},
];

/** Flat lookup of registry items by type. */
export function getRegistryItem(type: IRNodeType): NodeRegistryItem | undefined {
	for (const group of NODE_REGISTRY) {
		const item = group.items.find((i) => i.type === type);
		if (item) return item;
	}
	return undefined;
}

/** Formats the node registry as text for use in AI system prompts. */
export function buildNodeRegistryPrompt(): string {
	const lines: string[] = ["# Available Node Types\n"];

	for (const group of NODE_REGISTRY) {
		lines.push(`## ${group.label}\n`);
		for (const item of group.items) {
			lines.push(`### ${item.label} (type: "${item.type}")`);
			lines.push(item.description);
			if (item.config.length > 0) {
				lines.push("Config:");
				for (const c of item.config) {
					lines.push(`  - ${c}`);
				}
			}
			if (item.events) {
				lines.push(`Events: ${item.events.join(", ")}`);
			}
			lines.push("");
		}
	}

	return lines.join("\n");
}
