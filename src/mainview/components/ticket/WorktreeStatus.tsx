import { useState, useEffect } from "react";
import { GitBranch, GitPullRequest, GitMerge, ExternalLink, Copy, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { rpc, onWorktreeMergeResult, onWorktreeDiffResult, onWorktreeCleanupDone, openExternal } from "../../rpc";
import type { WorkflowRun, MergeResult } from "../../../shared/types";
import { useCopyFeedback } from "../../hooks/useCopyFeedback";

interface WorktreeStatusProps {
	run: WorkflowRun;
}

type WorktreeState = "active" | "merged" | "conflict" | "pr_created" | "pending";

function getWorktreeState(run: WorkflowRun, mergeResult: MergeResult | null): WorktreeState {
	if (run.status === "active") return "active";
	if (mergeResult?.conflicted) return "conflict";
	if (mergeResult?.success && mergeResult.prUrl && !run.worktreePath) return "merged";
	if (mergeResult?.success && mergeResult.prUrl) return "pr_created";
	if (mergeResult?.success) return "merged";
	if (!run.worktreePath) return "merged";
	return "pending";
}

const stateConfig: Record<WorktreeState, {
	label: string;
	badgeClass: string;
	accentBorder: string;
	icon: typeof GitBranch;
	iconClass: string;
}> = {
	active: {
		label: "Active",
		badgeClass: "bg-yellow-900/30 text-yellow-400 border-yellow-700/50",
		accentBorder: "border-l-yellow-500",
		icon: GitBranch,
		iconClass: "text-yellow-400",
	},
	merged: {
		label: "Merged",
		badgeClass: "bg-purple-900/30 text-purple-400 border-purple-700/50",
		accentBorder: "border-l-purple-500",
		icon: GitMerge,
		iconClass: "text-purple-400",
	},
	conflict: {
		label: "Conflict",
		badgeClass: "bg-red-900/30 text-red-400 border-red-700/50",
		accentBorder: "border-l-red-500",
		icon: AlertTriangle,
		iconClass: "text-red-400",
	},
	pr_created: {
		label: "PR Open",
		badgeClass: "bg-green-900/30 text-green-400 border-green-700/50",
		accentBorder: "border-l-green-500",
		icon: GitPullRequest,
		iconClass: "text-green-400",
	},
	pending: {
		label: "Pending",
		badgeClass: "bg-blue-900/30 text-blue-400 border-blue-700/50",
		accentBorder: "border-l-blue-500",
		icon: GitBranch,
		iconClass: "text-[#8b949e]",
	},
};

function DiffLine({ line }: { line: string }) {
	if (line.startsWith("+") && !line.startsWith("+++")) {
		return <span className="text-emerald-400">{line}</span>;
	}
	if (line.startsWith("-") && !line.startsWith("---")) {
		return <span className="text-red-400">{line}</span>;
	}
	if (line.startsWith("@@")) {
		return <span className="text-[#58a6ff]">{line}</span>;
	}
	return <span className="text-[#8b949e]">{line}</span>;
}

export function WorktreeStatus({ run }: WorktreeStatusProps) {
	const [mergeResult, setMergeResult] = useState<MergeResult | null>(run.mergeResult ?? null);
	const [diffText, setDiffText] = useState<string | null>(null);
	const [showDiff, setShowDiff] = useState(false);
	const [loading, setLoading] = useState(false);
	const [cleaned, setCleaned] = useState(false);
	const { copied, copy } = useCopyFeedback();

	useEffect(() => {
		const unsubMerge = onWorktreeMergeResult(({ runId, result }) => {
			if (runId !== run.id) return;
			setMergeResult(result);
			setLoading(false);

			if (result.success && result.prUrl) {
				toast.success("Pull request created");
			} else if (result.success) {
				toast.success("Branch merged successfully");
			} else if (result.conflicted) {
				toast.error("Merge conflicts detected");
			} else if (result.error) {
				toast.error(`Merge failed: ${result.error}`);
			}
		});
		const unsubDiff = onWorktreeDiffResult(({ runId, diff }) => {
			if (runId !== run.id) return;
			setDiffText(diff);
			setShowDiff(true);
			setLoading(false);
		});
		const unsubCleanup = onWorktreeCleanupDone(({ runId }) => {
			if (runId !== run.id) return;
			setCleaned(true);
			setLoading(false);
			toast.success("Worktree cleaned up");
		});
		return () => { unsubMerge(); unsubDiff(); unsubCleanup(); };
	}, [run.id]);

	const state = cleaned ? "merged"
		: getWorktreeState(run, mergeResult);

	const handleViewDiff = () => {
		if (showDiff) {
			setShowDiff(false);
			return;
		}
		setLoading(true);
		rpc.request.getWorktreeDiff({ runId: run.id });
	};

	const handleMerge = (strategy: "direct" | "pr") => {
		setLoading(true);
		setMergeResult(null);
		rpc.request.mergeWorktreeBranch({ runId: run.id, strategy });
	};

	const handleCleanup = () => {
		setLoading(true);
		rpc.request.cleanupWorktree({ runId: run.id });
	};

	const copyBranch = () => {
		if (run.worktreeBranch) {
			copy(run.worktreeBranch);
		}
	};

	const isMergedState = state === "merged";
	const showActions = run.worktreePath && !cleaned && !isMergedState;
	const config = stateConfig[state];
	const StateIcon = config.icon;

	const hasBody = run.worktreeBranch
		|| (mergeResult?.conflicted && mergeResult.conflictFiles)
		|| (mergeResult?.success && !mergeResult.prUrl)
		|| mergeResult?.prUrl
		|| (mergeResult && !mergeResult.success && !mergeResult.conflicted && mergeResult.error)
		|| loading
		|| (showActions && (state === "pending" || state === "conflict" || state === "pr_created"))
		|| (showDiff && diffText);

	return (
		<div className={`rounded-lg border border-[#30363d] border-l-2 ${config.accentBorder} bg-[#161b22] overflow-hidden`}>
			{/* Header */}
			<div className="flex items-center gap-2.5 px-3.5 py-2.5">
				<StateIcon size={14} className={config.iconClass} />
				<span className="text-[11px] font-medium text-[#e6edf3] tracking-tight">
					Worktree
				</span>
				<span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${config.badgeClass}`}>
					{config.label}
				</span>

				{run.worktreeBranch && (
					<button
						onClick={copyBranch}
						className="ml-auto flex items-center gap-1.5 text-[11px] font-mono text-[#58a6ff] bg-[#0d1117] rounded-md px-2 py-1 border border-[#21262d] hover:border-[#58a6ff]/40 transition-colors truncate max-w-[240px] group"
						title="Click to copy branch name"
					>
						<span className="truncate">{run.worktreeBranch}</span>
						{copied ? (
							<Check size={10} className="text-emerald-400 shrink-0" />
						) : (
							<Copy size={10} className="text-[#6e7681] group-hover:text-[#58a6ff] shrink-0 transition-colors" />
						)}
					</button>
				)}
			</div>

			{/* Body */}
			{hasBody && (
				<div className="border-t border-[#21262d] px-3.5 py-3 space-y-3">
					{/* Conflict files */}
					{mergeResult?.conflicted && mergeResult.conflictFiles && (
						<div className="text-xs space-y-1.5">
							<p className="text-red-400 font-medium">Conflicted files:</p>
							<ul className="space-y-0.5">
								{mergeResult.conflictFiles.map((f) => (
									<li key={f} className="font-mono text-[11px] text-red-300/80 truncate pl-2 border-l border-red-800/50">
										{f}
									</li>
								))}
							</ul>
						</div>
					)}

					{/* Success message */}
					{mergeResult?.success && !mergeResult.prUrl && (
						<div className="flex items-center gap-2 text-xs text-green-400">
							<GitMerge size={12} />
							<span>Merged successfully</span>
						</div>
					)}

					{/* PR link */}
					{mergeResult?.prUrl && (
						<button
							type="button"
							onClick={() => openExternal(mergeResult.prUrl!)}
							className="flex items-center gap-2 text-xs text-green-400 hover:text-green-300 transition-colors w-full group"
						>
							<GitPullRequest size={12} className="shrink-0" />
							<span className="font-mono truncate">{mergeResult.prUrl}</span>
							<ExternalLink size={10} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
						</button>
					)}

					{/* Error message */}
					{mergeResult && !mergeResult.success && !mergeResult.conflicted && mergeResult.error && (
						<p className="text-xs text-red-400">{mergeResult.error}</p>
					)}

					{/* Loading */}
					{loading && (
						<div className="flex items-center gap-2 text-xs text-[#8b949e]">
							<span className="relative flex h-1.5 w-1.5">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8b949e] opacity-75" />
								<span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#8b949e]" />
							</span>
							Working...
						</div>
					)}

					{/* Actions — pending */}
					{state === "pending" && showActions && (
						<div className="flex items-center gap-1.5 pt-0.5">
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										onClick={handleViewDiff}
										disabled={loading}
										className="text-[11px] h-7 px-2.5 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]"
									>
										{showDiff ? "Hide Diff" : "View Diff"}
									</Button>
								</TooltipTrigger>
								<TooltipContent>Show uncommitted changes in the worktree</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleMerge("direct")}
										disabled={loading}
										className="text-[11px] h-7 px-2.5 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]"
									>
										Merge
									</Button>
								</TooltipTrigger>
								<TooltipContent>Auto-merge worktree branch into the base branch</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleMerge("pr")}
										disabled={loading}
										className="text-[11px] h-7 px-2.5 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]"
									>
										Create PR
									</Button>
								</TooltipTrigger>
								<TooltipContent>Open a pull request from the worktree branch</TooltipContent>
							</Tooltip>
							<div className="flex-1" />
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										onClick={handleCleanup}
										disabled={loading}
										className="text-[11px] h-7 px-2.5 text-[#6e7681] hover:text-red-400 hover:bg-red-900/20"
									>
										Cleanup
									</Button>
								</TooltipTrigger>
								<TooltipContent>Delete the worktree and its branch permanently</TooltipContent>
							</Tooltip>
						</div>
					)}

					{/* Actions — conflict */}
					{state === "conflict" && showActions && (
						<div className="flex items-center gap-1.5 pt-0.5">
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleMerge("direct")}
										disabled={loading}
										className="text-[11px] h-7 px-2.5 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]"
									>
										Retry Merge
									</Button>
								</TooltipTrigger>
								<TooltipContent>Retry the merge after resolving conflicts</TooltipContent>
							</Tooltip>
							<div className="flex-1" />
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										onClick={handleCleanup}
										disabled={loading}
										className="text-[11px] h-7 px-2.5 text-[#6e7681] hover:text-red-400 hover:bg-red-900/20"
									>
										Cleanup
									</Button>
								</TooltipTrigger>
								<TooltipContent>Delete the worktree and its branch permanently</TooltipContent>
							</Tooltip>
						</div>
					)}

					{/* Actions — pr_created */}
					{state === "pr_created" && showActions && (
						<div className="flex items-center gap-1.5 pt-0.5">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									setLoading(true);
									rpc.request.markPrMerged({ runId: run.id });
								}}
								disabled={loading}
								className="text-[11px] h-7 px-2.5 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]"
							>
								Mark as Merged
							</Button>
							<div className="flex-1" />
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										onClick={handleCleanup}
										disabled={loading}
										className="text-[11px] h-7 px-2.5 text-[#6e7681] hover:text-red-400 hover:bg-red-900/20"
									>
										Cleanup
									</Button>
								</TooltipTrigger>
								<TooltipContent>Delete the worktree and its branch permanently</TooltipContent>
							</Tooltip>
						</div>
					)}

					{/* Diff viewer */}
					{showDiff && diffText && (
						<pre className="text-[11px] font-mono bg-[#0d1117] rounded-md p-3 border border-[#21262d] max-h-72 overflow-auto whitespace-pre-wrap leading-relaxed scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-transparent">
							{diffText.split("\n").map((line, i) => (
								<span key={i}>
									<DiffLine line={line} />
									{"\n"}
								</span>
							))}
						</pre>
					)}
				</div>
			)}
		</div>
	);
}
