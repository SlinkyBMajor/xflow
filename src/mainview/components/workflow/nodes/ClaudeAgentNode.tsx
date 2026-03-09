import { memo } from "react";
import { GitBranch } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { WorkflowNodeShell } from "./WorkflowNodeShell";

function ClaudeAgentNodeInner({ data, selected }: NodeProps) {
	const config = data.config as { prompt?: string; worktreeEnabled?: boolean; outputLabel?: string };
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
			{config.outputLabel && (
				<span className="text-[10px] text-[#58a6ff]/60 font-mono flex items-center gap-1">
					<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
					{config.outputLabel}
				</span>
			)}
		</WorkflowNodeShell>
	);
}

export const ClaudeAgentNode = memo(ClaudeAgentNodeInner);
