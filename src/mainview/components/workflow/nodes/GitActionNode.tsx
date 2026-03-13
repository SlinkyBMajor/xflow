import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { WorkflowNodeShell } from "./WorkflowNodeShell";
import { GitPullRequest } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
	createPr: "Create PR",
	addReviewer: "Add Reviewer",
	mergePr: "Merge PR",
};

function GitActionNodeInner({ data, selected }: NodeProps) {
	const action = (data.config as { action?: string })?.action ?? "createPr";
	const actionLabel = ACTION_LABELS[action] ?? action;

	return (
		<WorkflowNodeShell selected={selected} accentColor="#f472b6" runStatus={data.runStatus as any}>
			<div className="flex items-center gap-2">
				<GitPullRequest className="h-3.5 w-3.5 text-[#f472b6]" />
				<span className="text-sm font-medium text-[#e6edf3]">{String(data.label)}</span>
			</div>
			<p className="text-xs text-[#8b949e] mt-1">{actionLabel}</p>
		</WorkflowNodeShell>
	);
}

export const GitActionNode = memo(GitActionNodeInner);
