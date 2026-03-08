import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { WorkflowNodeShell } from "./WorkflowNodeShell";

function CustomScriptNodeInner({ data, selected }: NodeProps) {
	const interpreter = (data.config as { interpreter?: string })?.interpreter || "bun";

	return (
		<WorkflowNodeShell selected={selected} accentColor="#f59e0b" runStatus={data.runStatus as any}>
			<div className="flex items-center gap-2">
				<span className="text-amber-400 text-xs font-mono font-bold">&gt;_</span>
				<span className="text-sm font-medium text-[#e6edf3]">{String(data.label)}</span>
			</div>
			<p className="text-xs text-[#8b949e] mt-1 font-mono">{interpreter}</p>
		</WorkflowNodeShell>
	);
}

export const CustomScriptNode = memo(CustomScriptNodeInner);
