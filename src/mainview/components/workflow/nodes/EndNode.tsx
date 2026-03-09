import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Square } from "lucide-react";
import { WorkflowNodeShell } from "./WorkflowNodeShell";

function EndNodeInner({ data, selected }: NodeProps) {
	return (
		<WorkflowNodeShell selected={selected} accentColor="#ef4444" showSourceHandle={false} runStatus={data.runStatus as any}>
			<div className="flex items-center gap-2">
				<Square size={14} className="text-red-500" />
				<span className="text-sm font-medium text-[#e6edf3]">End</span>
			</div>
		</WorkflowNodeShell>
	);
}

export const EndNode = memo(EndNodeInner);
