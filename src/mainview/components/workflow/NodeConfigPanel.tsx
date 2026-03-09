import type { Node } from "@xyflow/react";
import type { IRNodeConfig, IRNodeType, Lane } from "../../../shared/types";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { getNodeLabel } from "../../lib/workflow-ir";

const NODE_DESCRIPTIONS: Record<IRNodeType, string> = {
	start: "Entry point of the workflow",
	end: "Terminal node — ends the workflow run",
	claudeAgent: "Runs a Claude Code agent with a prompt",
	customScript: "Executes a shell or Bun script",
	notify: "Sends a desktop notification",
	waitForApproval: "Pauses the workflow until manually approved",
	moveToLane: "Moves the ticket to another lane",
	condition: "Branches based on a JavaScript expression",
	setMetadata: "Sets a key-value pair on the ticket",
	log: "Logs a message to the workflow output",
};

interface NodeConfigPanelProps {
	node: Node;
	lanes: Lane[];
	onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
	onDelete: (nodeId: string) => void;
}

export function NodeConfigPanel({ node, lanes, onUpdate, onDelete }: NodeConfigPanelProps) {
	const config = node.data.config as IRNodeConfig;
	const nodeType = node.type as IRNodeType;
	const isFlowNode = nodeType === "start" || nodeType === "end";

	const updateConfig = (updates: Record<string, unknown>) => {
		onUpdate(node.id, { ...node.data, config: { ...config, ...updates } });
	};

	const updateLabel = (label: string) => {
		onUpdate(node.id, { ...node.data, label });
	};

	return (
		<div className="w-64 bg-[#161b22]/50 border-l border-[#21262d] p-4 overflow-y-auto">
			<div className="flex items-center justify-between mb-4">
				<Tooltip>
					<TooltipTrigger asChild>
						<h3 className="text-[13px] font-semibold text-[#e6edf3] cursor-default">{getNodeLabel(nodeType)}</h3>
					</TooltipTrigger>
					<TooltipContent>{NODE_DESCRIPTIONS[nodeType]}</TooltipContent>
				</Tooltip>
			</div>

			<div className="space-y-3">
				<div>
					<Label htmlFor="node-label" className="text-xs text-[#8b949e] mb-1">Label</Label>
					<Input
						id="node-label"
						value={node.data.label as string || ""}
						onChange={(e) => updateLabel(e.target.value)}
						className="h-8 text-sm"
					/>
				</div>

				{renderConfigFields(config, updateConfig, lanes)}
			</div>

			{!isFlowNode && (
				<div className="mt-6 pt-4 border-t border-[#21262d]">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => onDelete(node.id)}
								className="w-full text-red-400 hover:text-red-300 hover:bg-red-950/30"
							>
								Delete Node
							</Button>
						</TooltipTrigger>
						<TooltipContent>Remove this node and disconnect its edges</TooltipContent>
					</Tooltip>
				</div>
			)}
		</div>
	);
}

function renderConfigFields(
	config: IRNodeConfig,
	updateConfig: (updates: Record<string, unknown>) => void,
	lanes: Lane[],
) {
	switch (config.type) {
		case "claudeAgent":
			return (
				<>
					<div>
						<Label className="text-xs text-[#8b949e] mb-1">Prompt</Label>
						<Textarea
							value={config.prompt}
							onChange={(e) => updateConfig({ prompt: e.target.value })}
							className="text-sm min-h-[80px]"
							placeholder="Enter prompt for Claude..."
						/>
					</div>
					<div>
						<Label className="text-xs text-[#8b949e] mb-1">Output Label</Label>
						<Input
							value={config.outputLabel ?? ""}
							onChange={(e) => updateConfig({ outputLabel: e.target.value || undefined })}
							className="h-8 text-sm"
							placeholder='e.g., "Plan", "Implementation"'
						/>
					</div>
					<div>
						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={config.includeWorkflowOutput ?? true}
								onChange={(e) => updateConfig({ includeWorkflowOutput: e.target.checked })}
								className="rounded border-[#30363d] bg-[#0d1117] text-[#58a6ff] focus:ring-[#58a6ff]/30 h-3.5 w-3.5"
							/>
							<span className="text-xs text-[#8b949e]">Include prior workflow output</span>
						</label>
					</div>
					<div>
						<Label className="text-xs text-[#8b949e] mb-1">Timeout (seconds)</Label>
						<Input
							type="number"
							min={10}
							value={Math.round((config.timeoutMs ?? 600000) / 1000)}
							onChange={(e) => {
								const secs = parseInt(e.target.value);
								if (secs > 0) updateConfig({ timeoutMs: secs * 1000 });
							}}
							className="h-8 text-sm w-28"
						/>
					</div>
					<div>
						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={config.worktreeEnabled ?? false}
								onChange={(e) => updateConfig({ worktreeEnabled: e.target.checked })}
								className="rounded border-[#30363d] bg-[#0d1117] text-[#58a6ff] focus:ring-[#58a6ff]/30 h-3.5 w-3.5"
							/>
							<span className="text-xs text-[#8b949e]">Use git worktree (isolate from other agents)</span>
						</label>
					</div>
					{config.worktreeEnabled && (
						<>
							<div>
								<Label className="text-xs text-[#8b949e] mb-1">After completion</Label>
								<select
									value={config.mergeStrategy ?? "manual"}
									onChange={(e) => updateConfig({ mergeStrategy: e.target.value })}
									className="w-full h-8 text-sm bg-[#0d1117] border border-[#30363d] rounded-md px-2 text-[#e6edf3]"
								>
									<option value="auto">Auto-merge</option>
									<option value="pr">Create PR</option>
									<option value="manual">Manual</option>
								</select>
							</div>
							<div>
								<Label className="text-xs text-[#8b949e] mb-1">Base branch (optional)</Label>
								<Input
									value={config.baseBranch ?? ""}
									onChange={(e) => updateConfig({ baseBranch: e.target.value || undefined })}
									className="h-8 text-sm"
									placeholder="Defaults to current branch"
								/>
							</div>
						</>
					)}
				</>
			);
		case "customScript":
			return (
				<>
					<div>
						<Label className="text-xs text-[#8b949e] mb-1">Script</Label>
						<Textarea
							value={config.script}
							onChange={(e) => updateConfig({ script: e.target.value })}
							className="text-sm min-h-[80px] font-mono"
							placeholder="Enter script..."
						/>
					</div>
					<div>
						<Label className="text-xs text-[#8b949e] mb-1">Interpreter</Label>
						<select
							value={config.interpreter ?? "bun"}
							onChange={(e) => updateConfig({ interpreter: e.target.value })}
							className="w-full h-8 text-sm bg-[#0d1117] border border-[#30363d] rounded-md px-2 text-[#e6edf3]"
						>
							<option value="bun">Bun</option>
							<option value="sh">Shell</option>
						</select>
					</div>
					<div>
						<Label className="text-xs text-[#8b949e] mb-1">Timeout (seconds)</Label>
						<Input
							type="number"
							min={5}
							value={Math.round((config.timeoutMs ?? 30000) / 1000)}
							onChange={(e) => {
								const secs = parseInt(e.target.value);
								if (secs > 0) updateConfig({ timeoutMs: secs * 1000 });
							}}
							className="h-8 text-sm w-28"
						/>
					</div>
				</>
			);
		case "notify":
			return (
				<>
					<div>
						<Label className="text-xs text-[#8b949e] mb-1">Title</Label>
						<Input
							value={config.title}
							onChange={(e) => updateConfig({ title: e.target.value })}
							className="h-8 text-sm"
						/>
					</div>
					<div>
						<Label className="text-xs text-[#8b949e] mb-1">Body</Label>
						<Textarea
							value={config.body}
							onChange={(e) => updateConfig({ body: e.target.value })}
							className="text-sm min-h-[60px]"
						/>
					</div>
				</>
			);
		case "waitForApproval":
			return (
				<div>
					<Label className="text-xs text-[#8b949e] mb-1">Message</Label>
					<Textarea
						value={config.message}
						onChange={(e) => updateConfig({ message: e.target.value })}
						className="text-sm min-h-[60px]"
						placeholder="Message shown to approver..."
					/>
				</div>
			);
		case "moveToLane":
			return (
				<div>
					<Label className="text-xs text-[#8b949e] mb-1">Target Lane</Label>
					<select
						value={config.laneId}
						onChange={(e) => {
							const lane = lanes.find((l) => l.id === e.target.value);
							updateConfig({ laneId: e.target.value, laneName: lane?.name ?? "" });
						}}
						className="w-full h-8 text-sm bg-[#0d1117] border border-[#30363d] rounded-md px-2 text-[#e6edf3]"
					>
						<option value="">Select lane...</option>
						{lanes.map((lane) => (
							<option key={lane.id} value={lane.id}>{lane.name}</option>
						))}
					</select>
				</div>
			);
		case "condition":
			return (
				<div>
					<Label className="text-xs text-[#8b949e] mb-1">Expression</Label>
					<Textarea
						value={config.expression}
						onChange={(e) => updateConfig({ expression: e.target.value })}
						className="text-sm min-h-[60px] font-mono"
						placeholder="ticket.metadata.status === 'ready'"
					/>
				</div>
			);
		case "setMetadata":
			return (
				<>
					<div>
						<Label className="text-xs text-[#8b949e] mb-1">Key</Label>
						<Input
							value={config.key}
							onChange={(e) => updateConfig({ key: e.target.value })}
							className="h-8 text-sm font-mono"
						/>
					</div>
					<div>
						<Label className="text-xs text-[#8b949e] mb-1">Value</Label>
						<Input
							value={config.value}
							onChange={(e) => updateConfig({ value: e.target.value })}
							className="h-8 text-sm"
						/>
					</div>
				</>
			);
		case "log":
			return (
				<div>
					<Label className="text-xs text-[#8b949e] mb-1">Message</Label>
					<Textarea
						value={config.message}
						onChange={(e) => updateConfig({ message: e.target.value })}
						className="text-sm min-h-[60px]"
						placeholder="Log message template..."
					/>
				</div>
			);
		case "start":
		case "end":
			return <p className="text-xs text-[#8b949e]">No configuration needed.</p>;
	}
}
