import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { WorkflowNodeShell } from "./WorkflowNodeShell";

function LogNodeInner({ data, selected }: NodeProps) {
	const message = (data.config as { message?: string })?.message || "";
	const preview = message.length > 40 ? message.slice(0, 40) + "..." : message;

	return (
		<WorkflowNodeShell selected={selected} accentColor="#71717a">
			<div className="flex items-center gap-2">
				<span className="text-zinc-400 text-xs font-mono font-bold">Aa</span>
				<span className="text-sm font-medium text-zinc-200">{String(data.label)}</span>
			</div>
			{preview && <p className="text-xs text-zinc-500 mt-1 truncate">{preview}</p>}
		</WorkflowNodeShell>
	);
}

export const LogNode = memo(LogNodeInner);
