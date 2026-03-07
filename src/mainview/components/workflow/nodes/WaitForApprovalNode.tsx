import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { WorkflowNodeShell } from "./WorkflowNodeShell";

function WaitForApprovalNodeInner({ data, selected }: NodeProps) {
	const message = (data.config as { message?: string })?.message || "";

	return (
		<WorkflowNodeShell
			selected={selected}
			accentColor="#f97316"
			runStatus={data.runStatus as any}
			sourceHandles={[
				{ id: "APPROVED", label: "APPROVED" },
				{ id: "REJECTED", label: "REJECTED" },
			]}
		>
			<div className="flex items-center gap-2">
				<span className="text-orange-400 text-sm font-bold">&#9646;&#9646;</span>
				<span className="text-sm font-medium text-zinc-200">{String(data.label)}</span>
			</div>
			{message && <p className="text-xs text-zinc-500 mt-1 truncate">{message}</p>}
		</WorkflowNodeShell>
	);
}

export const WaitForApprovalNode = memo(WaitForApprovalNodeInner);
