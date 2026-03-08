import { memo } from "react";
import { GitBranch } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { WorkflowNodeShell } from "./WorkflowNodeShell";

function ClaudeAgentNodeInner({ data, selected }: NodeProps) {
	const config = data.config as { prompt?: string; worktreeEnabled?: boolean };
	const prompt = config?.prompt || "";
	const preview = prompt.length > 40 ? prompt.slice(0, 40) + "..." : prompt;
	const worktreeEnabled = config?.worktreeEnabled ?? false;

	return (
		<WorkflowNodeShell selected={selected} accentColor="#58a6ff" runStatus={data.runStatus as any}>
			<div className="flex items-center gap-2">
				<span className="text-[#58a6ff] text-sm font-bold">&#10022;</span>
				<span className="text-sm font-medium text-[#e6edf3]">{String(data.label)}</span>
				{worktreeEnabled && (
					<GitBranch size={12} className="text-[#8b949e] flex-shrink-0" />
				)}
			</div>
			{preview && <p className="text-xs text-[#8b949e] mt-1 font-mono truncate">{preview}</p>}
		</WorkflowNodeShell>
	);
}

export const ClaudeAgentNode = memo(ClaudeAgentNodeInner);
