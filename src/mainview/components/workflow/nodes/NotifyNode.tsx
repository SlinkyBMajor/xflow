import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Bell } from "lucide-react";
import { WorkflowNodeShell } from "./WorkflowNodeShell";

function NotifyNodeInner({ data, selected }: NodeProps) {
	const title = (data.config as { title?: string })?.title || "";

	return (
		<WorkflowNodeShell selected={selected} accentColor="#06b6d4" runStatus={data.runStatus as any}>
			<div className="flex items-center gap-2">
				<Bell className="w-3.5 h-3.5 text-cyan-400" />
				<span className="text-sm font-medium text-[#e6edf3]">{String(data.label)}</span>
			</div>
			{title && <p className="text-xs text-[#8b949e] mt-1 truncate">{title}</p>}
		</WorkflowNodeShell>
	);
}

export const NotifyNode = memo(NotifyNodeInner);
