import { GitBranch, GitPullRequest, GitMerge } from "lucide-react";
import type { WorkflowRun } from "../../../shared/types";
import { useCopyFeedback } from "../../hooks/useCopyFeedback";

interface WorktreeSidebarIndicatorProps {
	run: WorkflowRun;
}

type WorktreeState = "active" | "merged" | "conflict" | "pr_created" | "pending";

function getWorktreeState(run: WorkflowRun): WorktreeState {
	if (run.status === "active") return "active";
	if (run.mergeResult?.conflicted) return "conflict";
	if (run.mergeResult?.success && run.mergeResult.prUrl && !run.worktreePath) return "merged";
	if (run.mergeResult?.success && run.mergeResult.prUrl) return "pr_created";
	if (run.mergeResult?.success) return "merged";
	if (!run.worktreePath) return "merged";
	return "pending";
}

const stateStyles: Record<WorktreeState, string> = {
	active: "bg-yellow-900/30 text-yellow-400 border-yellow-800",
	merged: "bg-purple-900/30 text-purple-400 border-purple-800",
	conflict: "bg-red-900/30 text-red-400 border-red-800",
	pr_created: "bg-green-900/30 text-green-400 border-green-800",
	pending: "bg-blue-900/30 text-blue-400 border-blue-800",
};

const stateLabels: Record<WorktreeState, string> = {
	active: "Active",
	merged: "Merged",
	conflict: "Conflict",
	pr_created: "PR Open",
	pending: "Pending",
};

export function WorktreeSidebarIndicator({ run }: WorktreeSidebarIndicatorProps) {
	const { copied, copy } = useCopyFeedback();
	const state = getWorktreeState(run);
	const Icon = state === "merged" && run.mergeResult?.prUrl ? GitMerge
		: state === "pr_created" ? GitPullRequest
		: GitBranch;
	const iconColor = state === "merged" && run.mergeResult?.prUrl ? "text-purple-400"
		: state === "pr_created" ? "text-green-400"
		: "text-[#8b949e]";

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<Icon size={12} className={iconColor} />
					<span className="text-[10px] font-mono text-[#6e7681] uppercase tracking-wider">
						Worktree
					</span>
				</div>
				<span className={`text-[10px] px-1.5 py-0.5 rounded border ${stateStyles[state]}`}>
					{stateLabels[state]}
				</span>
			</div>

			{run.worktreeBranch && (
				<button
					onClick={() => copy(run.worktreeBranch!)}
					className="w-full text-left text-[11px] font-mono text-[#58a6ff] bg-[#0d1117] rounded px-2 py-1 border border-[#21262d] hover:border-[#58a6ff]/50 transition-colors truncate"
					title="Click to copy branch name"
				>
					{copied ? "Copied!" : run.worktreeBranch}
				</button>
			)}
		</div>
	);
}
