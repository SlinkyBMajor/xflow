import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { WorkflowNodeShell } from "./WorkflowNodeShell";

function NotifyNodeInner({ data, selected }: NodeProps) {
	const title = (data.config as { title?: string })?.title || "";

	return (
		<WorkflowNodeShell selected={selected} accentColor="#06b6d4" runStatus={data.runStatus as any}>
			<div className="flex items-center gap-2">
				<span className="text-cyan-400 text-sm">&#9883;</span>
				<span className="text-sm font-medium text-zinc-200">{String(data.label)}</span>
			</div>
			{title && <p className="text-xs text-zinc-500 mt-1 truncate">{title}</p>}
		</WorkflowNodeShell>
	);
}

export const NotifyNode = memo(NotifyNodeInner);
