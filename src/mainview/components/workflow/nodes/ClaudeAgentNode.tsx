import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { WorkflowNodeShell } from "./WorkflowNodeShell";

function ClaudeAgentNodeInner({ data, selected }: NodeProps) {
	const prompt = (data.config as { prompt?: string })?.prompt || "";
	const preview = prompt.length > 40 ? prompt.slice(0, 40) + "..." : prompt;

	return (
		<WorkflowNodeShell selected={selected} accentColor="#8b5cf6">
			<div className="flex items-center gap-2">
				<span className="text-violet-400 text-sm font-bold">&#10022;</span>
				<span className="text-sm font-medium text-zinc-200">{String(data.label)}</span>
			</div>
			{preview && <p className="text-xs text-zinc-500 mt-1 font-mono truncate">{preview}</p>}
		</WorkflowNodeShell>
	);
}

export const ClaudeAgentNode = memo(ClaudeAgentNodeInner);
