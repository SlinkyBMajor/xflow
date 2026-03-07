import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { WorkflowNodeShell } from "./WorkflowNodeShell";

function MoveToLaneNodeInner({ data, selected }: NodeProps) {
	const laneName = (data.config as { laneName?: string })?.laneName || "";

	return (
		<WorkflowNodeShell selected={selected} accentColor="#3b82f6" runStatus={data.runStatus as any}>
			<div className="flex items-center gap-2">
				<span className="text-blue-400 text-sm font-bold">&#8594;</span>
				<span className="text-sm font-medium text-zinc-200">{String(data.label)}</span>
			</div>
			{laneName && <p className="text-xs text-zinc-500 mt-1 truncate">{laneName}</p>}
		</WorkflowNodeShell>
	);
}

export const MoveToLaneNode = memo(MoveToLaneNodeInner);
