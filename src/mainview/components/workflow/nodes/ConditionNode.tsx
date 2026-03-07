import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { WorkflowNodeShell } from "./WorkflowNodeShell";

function ConditionNodeInner({ data, selected }: NodeProps) {
	const expression = (data.config as { expression?: string })?.expression || "";

	return (
		<WorkflowNodeShell
			selected={selected}
			accentColor="#eab308"
			sourceHandles={[
				{ id: "TRUE", label: "TRUE" },
				{ id: "FALSE", label: "FALSE" },
			]}
		>
			<div className="flex items-center gap-2">
				<span className="text-yellow-400 text-sm font-bold">&#9095;</span>
				<span className="text-sm font-medium text-zinc-200">{String(data.label)}</span>
			</div>
			{expression && <p className="text-xs text-zinc-500 mt-1 font-mono truncate">{expression}</p>}
		</WorkflowNodeShell>
	);
}

export const ConditionNode = memo(ConditionNodeInner);
