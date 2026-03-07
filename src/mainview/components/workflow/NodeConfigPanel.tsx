import type { Node } from "@xyflow/react";
import type { IRNodeConfig, IRNodeType, Lane } from "../../../shared/types";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { getNodeLabel } from "../../lib/workflow-ir";

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
		<div className="w-64 bg-zinc-900 border-l border-zinc-800 p-4 overflow-y-auto">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-sm font-semibold text-zinc-200">{getNodeLabel(nodeType)}</h3>
			</div>

			<div className="space-y-3">
				<div>
					<Label htmlFor="node-label" className="text-xs text-zinc-400 mb-1">Label</Label>
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
				<div className="mt-6 pt-4 border-t border-zinc-800">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onDelete(node.id)}
						className="w-full text-red-400 hover:text-red-300 hover:bg-red-950/30"
					>
						Delete Node
					</Button>
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
						<Label className="text-xs text-zinc-400 mb-1">Prompt</Label>
						<Textarea
							value={config.prompt}
							onChange={(e) => updateConfig({ prompt: e.target.value })}
							className="text-sm min-h-[80px]"
							placeholder="Enter prompt for Claude..."
						/>
					</div>
					<div>
						<Label className="text-xs text-zinc-400 mb-1">Timeout (ms)</Label>
						<Input
							type="number"
							value={config.timeoutMs ?? 60000}
							onChange={(e) => updateConfig({ timeoutMs: parseInt(e.target.value) || undefined })}
							className="h-8 text-sm w-28"
						/>
					</div>
				</>
			);
		case "customScript":
			return (
				<>
					<div>
						<Label className="text-xs text-zinc-400 mb-1">Script</Label>
						<Textarea
							value={config.script}
							onChange={(e) => updateConfig({ script: e.target.value })}
							className="text-sm min-h-[80px] font-mono"
							placeholder="Enter script..."
						/>
					</div>
					<div>
						<Label className="text-xs text-zinc-400 mb-1">Interpreter</Label>
						<select
							value={config.interpreter ?? "bun"}
							onChange={(e) => updateConfig({ interpreter: e.target.value })}
							className="w-full h-8 text-sm bg-zinc-800 border border-zinc-700 rounded-md px-2 text-zinc-200"
						>
							<option value="bun">Bun</option>
							<option value="sh">Shell</option>
						</select>
					</div>
				</>
			);
		case "notify":
			return (
				<>
					<div>
						<Label className="text-xs text-zinc-400 mb-1">Title</Label>
						<Input
							value={config.title}
							onChange={(e) => updateConfig({ title: e.target.value })}
							className="h-8 text-sm"
						/>
					</div>
					<div>
						<Label className="text-xs text-zinc-400 mb-1">Body</Label>
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
					<Label className="text-xs text-zinc-400 mb-1">Message</Label>
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
					<Label className="text-xs text-zinc-400 mb-1">Target Lane</Label>
					<select
						value={config.laneId}
						onChange={(e) => {
							const lane = lanes.find((l) => l.id === e.target.value);
							updateConfig({ laneId: e.target.value, laneName: lane?.name ?? "" });
						}}
						className="w-full h-8 text-sm bg-zinc-800 border border-zinc-700 rounded-md px-2 text-zinc-200"
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
					<Label className="text-xs text-zinc-400 mb-1">Expression</Label>
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
						<Label className="text-xs text-zinc-400 mb-1">Key</Label>
						<Input
							value={config.key}
							onChange={(e) => updateConfig({ key: e.target.value })}
							className="h-8 text-sm font-mono"
						/>
					</div>
					<div>
						<Label className="text-xs text-zinc-400 mb-1">Value</Label>
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
					<Label className="text-xs text-zinc-400 mb-1">Message</Label>
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
			return <p className="text-xs text-zinc-500">No configuration needed.</p>;
	}
}
