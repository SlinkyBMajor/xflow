import { useState, useEffect } from "react";
import { GitBranch, GitPullRequest, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { rpc, onWorktreeMergeResult, onWorktreeDiffResult, onWorktreeCleanupDone, openExternal } from "../../rpc";
import type { WorkflowRun, MergeResult } from "../../../shared/types";

interface WorktreeStatusProps {
	run: WorkflowRun;
}

type WorktreeState = "active" | "merged" | "conflict" | "pr_created" | "pending";

function getWorktreeState(run: WorkflowRun, mergeResult: MergeResult | null): WorktreeState {
	if (run.status === "active") return "active";
	if (mergeResult?.conflicted) return "conflict";
	if (mergeResult?.success && mergeResult.prUrl) return "pr_created";
	if (mergeResult?.success) return "merged";
	if (!run.worktreePath) return "merged";
	return "pending";
}

const stateStyles: Record<WorktreeState, string> = {
	active: "bg-yellow-900/30 text-yellow-400 border-yellow-800",
	merged: "bg-green-900/30 text-green-400 border-green-800",
	conflict: "bg-red-900/30 text-red-400 border-red-800",
	pr_created: "bg-purple-900/30 text-purple-400 border-purple-800",
	pending: "bg-blue-900/30 text-blue-400 border-blue-800",
};

const stateLabels: Record<WorktreeState, string> = {
	active: "Active",
	merged: "Merged",
	conflict: "Conflict",
	pr_created: "PR Open",
	pending: "Pending",
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

	const handleMerge = (strategy?: "auto" | "pr") => {
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
			navigator.clipboard.writeText(run.worktreeBranch);
		}
	};

	const showActions = run.worktreePath && !cleaned;

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<div className="flex items-center gap-2">
					{state === "pr_created" ? (
						<GitPullRequest size={14} className="text-purple-400" />
					) : (
						<GitBranch size={14} className="text-[#8b949e]" />
					)}
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
					onClick={copyBranch}
					className="text-left text-xs font-mono text-[#58a6ff] bg-[#0d1117] rounded px-3 py-2 border border-[#21262d] hover:border-[#58a6ff]/50 transition-colors truncate max-w-md"
					title="Click to copy branch name"
				>
					{run.worktreeBranch}
				</button>
			)}

			{mergeResult?.conflicted && mergeResult.conflictFiles && (
				<div className="text-xs text-red-400 space-y-1">
					<p className="font-medium">Conflicted files:</p>
					<ul className="list-disc list-inside space-y-0.5">
						{mergeResult.conflictFiles.map((f) => (
							<li key={f} className="font-mono truncate">{f}</li>
						))}
					</ul>
				</div>
			)}

			{mergeResult?.success && mergeResult.strategy === "auto" && !mergeResult.prUrl && (
				<p className="text-xs text-green-400">Merged successfully</p>
			)}

			{mergeResult?.prUrl && (
				<button
					type="button"
					onClick={() => openExternal(mergeResult.prUrl!)}
					className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
				>
					<GitPullRequest size={12} />
					<span className="font-mono">{mergeResult.prUrl}</span>
					<ExternalLink size={10} />
				</button>
			)}

			{mergeResult && !mergeResult.success && !mergeResult.conflicted && mergeResult.error && (
				<p className="text-xs text-red-400">{mergeResult.error}</p>
			)}

			{loading && (
				<p className="text-xs text-[#8b949e]">Working...</p>
			)}

			{state === "pending" && showActions && (
				<div className="flex gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleViewDiff}
						disabled={loading}
						className="text-xs h-8 text-[#8b949e] hover:text-[#e6edf3]"
					>
						{showDiff ? "Hide Diff" : "View Diff"}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => handleMerge("auto")}
						disabled={loading}
						className="text-xs h-8 text-[#8b949e] hover:text-[#e6edf3]"
					>
						Merge
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => handleMerge("pr")}
						disabled={loading}
						className="text-xs h-8 text-[#8b949e] hover:text-[#e6edf3]"
					>
						Create PR
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleCleanup}
						disabled={loading}
						className="text-xs h-8 text-red-400 hover:text-red-300"
					>
						Cleanup
					</Button>
				</div>
			)}

			{state === "conflict" && showActions && (
				<div className="flex gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => handleMerge("auto")}
						disabled={loading}
						className="text-xs h-8 text-[#8b949e] hover:text-[#e6edf3]"
					>
						Retry Merge
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleCleanup}
						disabled={loading}
						className="text-xs h-8 text-red-400 hover:text-red-300"
					>
						Cleanup
					</Button>
				</div>
			)}

			{state === "pr_created" && showActions && (
				<div className="flex gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleCleanup}
						disabled={loading}
						className="text-xs h-8 text-red-400 hover:text-red-300"
					>
						Cleanup
					</Button>
				</div>
			)}

			{showDiff && diffText && (
				<pre className="text-[11px] font-mono bg-[#0d1117] rounded-lg p-3 border border-[#21262d] max-h-80 overflow-auto whitespace-pre-wrap leading-relaxed">
					{diffText.split("\n").map((line, i) => (
						<span key={i}>
							<DiffLine line={line} />
							{"\n"}
						</span>
					))}
				</pre>
			)}
		</div>
	);
}
