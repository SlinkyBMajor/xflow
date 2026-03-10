import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "../ui/dialog";
import type { IRNodeType } from "../../../shared/types";
import { getNodeLabel } from "../../lib/workflow-ir";

interface NodeInfo {
	type: IRNodeType;
	color: string;
	description: string;
	config: string[];
	events?: string[];
}

const GROUPS: { label: string; items: NodeInfo[] }[] = [
	{
		label: "Flow Control",
		items: [
			{
				type: "start",
				color: "#22c55e",
				description:
					"Entry point of every workflow. Receives the ticket context (title, description, metadata) and passes it downstream. Every workflow must have exactly one Start node.",
				config: [],
			},
			{
				type: "end",
				color: "#ef4444",
				description:
					"Terminal node that marks the run as complete. A workflow must have at least one End node. Multiple End nodes are allowed for different completion paths.",
				config: [],
			},
			{
				type: "condition",
				color: "#eab308",
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
				description:
					"Advances the ticket to a different lane on the board. If the destination lane has its own workflow, that workflow is triggered in turn.",
				config: ["laneId — target lane"],
			},
			{
				type: "setMetadata",
				color: "#10b981",
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
				description:
					"Appends a message to the ticket's run history. Useful for debugging and audit trails.",
				config: ["message — the message to log"],
			},
		],
	},
	{
		label: "Interactions",
		items: [
			{
				type: "notify",
				color: "#06b6d4",
				description: "Sends a native desktop notification via Electrobun.",
				config: [
					"title — notification title (supports {{ticket.title}} interpolation)",
					"body — notification body",
				],
			},
			{
				type: "waitForApproval",
				color: "#f97316",
				description:
					"Pauses the workflow and surfaces an approve/reject action in the ticket detail UI. On app restart, waiting nodes are automatically restored.",
				config: ["message — prompt shown to the reviewer"],
				events: ["APPROVED", "REJECTED"],
			},
		],
	},
];

interface NodeReferenceModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function NodeReferenceModal({ open, onOpenChange }: NodeReferenceModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col p-0">
				<DialogHeader className="px-5 pt-5 pb-3 border-b border-[#21262d]">
					<DialogTitle>Node Reference</DialogTitle>
					<DialogDescription>
						All available node types for building workflows.
					</DialogDescription>
				</DialogHeader>
				<div className="overflow-y-auto px-5 py-4 space-y-6">
					{GROUPS.map((group) => (
						<div key={group.label}>
							<h3 className="text-[10px] font-semibold text-[#6e7681] uppercase tracking-widest mb-3 font-mono">
								{group.label}
							</h3>
							<div className="space-y-3">
								{group.items.map((item) => (
									<div
										key={item.type}
										className="rounded-lg border border-[#21262d] bg-[#0d1117]/50 p-3"
									>
										<div className="flex items-center gap-2 mb-1.5">
											<div
												className="w-2 h-2 rounded-full flex-shrink-0"
												style={{ backgroundColor: item.color }}
											/>
											<span className="text-[13px] font-semibold text-[#e6edf3]">
												{getNodeLabel(item.type)}
											</span>
										</div>
										<p className="text-xs text-[#8b949e] leading-relaxed mb-2">
											{item.description}
										</p>
										{item.config.length > 0 && (
											<div className="mb-2">
												<span className="text-[10px] font-semibold text-[#6e7681] uppercase tracking-wider">
													Config
												</span>
												<ul className="mt-1 space-y-0.5">
													{item.config.map((c) => (
														<li key={c} className="text-xs text-[#8b949e] pl-2">
															<span className="text-[#6e7681] mr-1">•</span>
															<span className="text-[#e6edf3] font-mono text-[11px]">
																{c.split(" — ")[0]}
															</span>
															{c.includes(" — ") && (
																<span className="text-[#8b949e]">
																	{" — "}
																	{c.split(" — ").slice(1).join(" — ")}
																</span>
															)}
														</li>
													))}
												</ul>
											</div>
										)}
										{item.events && (
											<div>
												<span className="text-[10px] font-semibold text-[#6e7681] uppercase tracking-wider">
													Events
												</span>
												<div className="flex gap-1.5 mt-1">
													{item.events.map((evt) => (
														<span
															key={evt}
															className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e]"
														>
															{evt}
														</span>
													))}
												</div>
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
