import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { WorkflowNodeShell } from "./WorkflowNodeShell";

function StartNodeInner({ selected }: NodeProps) {
	return (
		<WorkflowNodeShell selected={selected} accentColor="#22c55e" showTargetHandle={false}>
			<div className="flex items-center gap-2">
				<div className="w-2 h-2 rounded-full bg-green-500" />
				<span className="text-sm font-medium text-zinc-200">Entry</span>
			</div>
		</WorkflowNodeShell>
	);
}

export const StartNode = memo(StartNodeInner);
