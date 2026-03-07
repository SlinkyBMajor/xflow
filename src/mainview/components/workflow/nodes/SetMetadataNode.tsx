import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { WorkflowNodeShell } from "./WorkflowNodeShell";

function SetMetadataNodeInner({ data, selected }: NodeProps) {
	const key = (data.config as { key?: string })?.key || "";

	return (
		<WorkflowNodeShell selected={selected} accentColor="#10b981">
			<div className="flex items-center gap-2">
				<span className="text-emerald-400 text-xs font-bold">#</span>
				<span className="text-sm font-medium text-zinc-200">{String(data.label)}</span>
			</div>
			{key && <p className="text-xs text-zinc-500 mt-1 font-mono truncate">{key}</p>}
		</WorkflowNodeShell>
	);
}

export const SetMetadataNode = memo(SetMetadataNodeInner);
