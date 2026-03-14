import type { BoardTemplate } from "../../shared/types";

export const BUILTIN_TEMPLATES: BoardTemplate[] = [
	{
		id: "builtin-simple-kanban",
		name: "Simple Kanban",
		description: "Basic three-column board for straightforward task tracking",
		version: 1,
		lanes: [
			{ name: "To Do", color: "#71717a", order: 0 },
			{ name: "In Progress", color: "#3b82f6", order: 1 },
			{ name: "Done", color: "#22c55e", order: 2 },
		],
		createdAt: "2024-01-01T00:00:00.000Z",
		builtIn: true,
	},
	{
		id: "builtin-ai-review",
		name: "AI Review Pipeline",
		description: "Automated review pipeline with Claude Agent and approval gate",
		version: 1,
		lanes: [
			{ name: "Backlog", color: "#71717a", order: 0 },
			{
				name: "Planning",
				color: "#8b5cf6",
				order: 1,
				workflow: {
					version: 1,
					nodes: [
						{ id: "start", type: "start", position: { x: 250, y: 50 }, config: { type: "start" } },
						{
							id: "agent",
							type: "claudeAgent",
							position: { x: 250, y: 150 },
							label: "AI Review",
							config: { type: "claudeAgent", prompt: "Review this ticket and provide analysis:\n\nTitle: {{ticket.title}}", timeoutMs: 120000 },
						},
						{
							id: "move",
							type: "moveToLane",
							position: { x: 250, y: 250 },
							label: "To Review",
							config: { type: "moveToLane", laneId: "", laneName: "Review" },
						},
						{ id: "end", type: "end", position: { x: 250, y: 350 }, config: { type: "end" } },
					],
					edges: [
						{ id: "e1", from: "start", to: "agent" },
						{ id: "e2", from: "agent", to: "move" },
						{ id: "e3", from: "move", to: "end" },
					],
				},
			},
			{
				name: "Review",
				color: "#f59e0b",
				order: 2,
				workflow: {
					version: 1,
					nodes: [
						{ id: "start", type: "start", position: { x: 250, y: 50 }, config: { type: "start" } },
						{
							id: "wait",
							type: "waitForApproval",
							position: { x: 250, y: 150 },
							label: "Approval Gate",
							config: { type: "waitForApproval", message: "Review the AI analysis and approve or reject." },
						},
						{
							id: "move-done",
							type: "moveToLane",
							position: { x: 150, y: 250 },
							label: "Approve",
							config: { type: "moveToLane", laneId: "", laneName: "Done" },
						},
						{
							id: "move-back",
							type: "moveToLane",
							position: { x: 350, y: 250 },
							label: "Reject",
							config: { type: "moveToLane", laneId: "", laneName: "Backlog" },
						},
						{ id: "end1", type: "end", position: { x: 150, y: 350 }, config: { type: "end" } },
						{ id: "end2", type: "end", position: { x: 350, y: 350 }, config: { type: "end" } },
					],
					edges: [
						{ id: "e1", from: "start", to: "wait" },
						{ id: "e2", from: "wait", to: "move-done", on: "APPROVED" },
						{ id: "e3", from: "wait", to: "move-back", on: "REJECTED" },
						{ id: "e4", from: "move-done", to: "end1" },
						{ id: "e5", from: "move-back", to: "end2" },
					],
				},
			},
			{ name: "Done", color: "#22c55e", order: 3 },
		],
		createdAt: "2024-01-01T00:00:00.000Z",
		builtIn: true,
	},
	{
		id: "builtin-sprint",
		name: "Sprint Board",
		description: "Five-column sprint board for agile development teams",
		version: 1,
		lanes: [
			{ name: "Backlog", color: "#71717a", order: 0 },
			{ name: "Sprint", color: "#8b5cf6", order: 1 },
			{ name: "In Progress", color: "#3b82f6", order: 2 },
			{ name: "Testing", color: "#f59e0b", order: 3 },
			{ name: "Done", color: "#22c55e", order: 4 },
		],
		createdAt: "2024-01-01T00:00:00.000Z",
		builtIn: true,
	},
];
