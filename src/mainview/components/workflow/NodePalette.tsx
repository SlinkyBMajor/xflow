import type { IRNodeType } from "../../../shared/types";
import { getNodeLabel } from "../../lib/workflow-ir";

interface NodePaletteItem {
	type: IRNodeType;
	color: string;
}

const GROUPS: { label: string; items: NodePaletteItem[] }[] = [
	{
		label: "Flow Control",
		items: [
			{ type: "start", color: "#22c55e" },
			{ type: "end", color: "#ef4444" },
			{ type: "condition", color: "#eab308" },
		],
	},
	{
		label: "Actions",
		items: [
			{ type: "claudeAgent", color: "#8b5cf6" },
			{ type: "customScript", color: "#f59e0b" },
			{ type: "moveToLane", color: "#3b82f6" },
			{ type: "setMetadata", color: "#10b981" },
			{ type: "log", color: "#71717a" },
		],
	},
	{
		label: "Interactions",
		items: [
			{ type: "notify", color: "#06b6d4" },
			{ type: "waitForApproval", color: "#f97316" },
		],
	},
];

export function NodePalette() {
	const onDragStart = (event: React.DragEvent, nodeType: IRNodeType) => {
		event.dataTransfer.setData("application/xflow-node-type", nodeType);
		event.dataTransfer.effectAllowed = "move";
	};

	return (
		<div className="w-48 bg-[#161b22]/50 border-r border-[#21262d] p-3 overflow-y-auto">
			<h3 className="text-[10px] font-semibold text-[#6e7681] uppercase tracking-widest mb-3 font-mono">Nodes</h3>
			{GROUPS.map((group) => (
				<div key={group.label} className="mb-4">
					<h4 className="text-[9px] font-semibold text-[#484f58] uppercase tracking-widest mb-1.5 font-mono">{group.label}</h4>
					<div className="space-y-0.5">
						{group.items.map((item) => (
							<div
								key={item.type}
								draggable
								onDragStart={(e) => onDragStart(e, item.type)}
								className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[#21262d]/30 border border-[#21262d]/40 cursor-grab hover:border-[#484f58]/50 hover:bg-[#21262d]/60 active:scale-[0.98] transition-all text-[12px] text-[#8b949e] hover:text-[#e6edf3]"
							>
								<div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
								{getNodeLabel(item.type)}
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
