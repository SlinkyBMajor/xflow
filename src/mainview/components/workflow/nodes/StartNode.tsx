import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Play } from "lucide-react";
import { WorkflowNodeShell } from "./WorkflowNodeShell";

function StartNodeInner({ data, selected }: NodeProps) {
	return (
		<WorkflowNodeShell selected={selected} accentColor="#22c55e" showTargetHandle={false} runStatus={data.runStatus as any}>
			<div className="flex items-center gap-2">
				<Play size={14} className="text-green-500" />
				<span className="text-sm font-medium text-[#e6edf3]">Entry</span>
			</div>
		</WorkflowNodeShell>
	);
}

export const StartNode = memo(StartNodeInner);
