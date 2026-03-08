import { useState } from "react";
import { Button } from "../ui/button";
import { rpc } from "../../rpc";
import type { WorkflowRun, MergeResult } from "../../../shared/types";

interface WorktreeStatusProps {
	run: WorkflowRun;
}

type WorktreeState = "active" | "merged" | "conflict" | "pending";

function getWorktreeState(run: WorkflowRun): WorktreeState {
	if (run.status === "active") return "active";
	if (!run.worktreePath) return "merged";
	return "pending";
}

const stateStyles: Record<WorktreeState, string> = {
	active: "bg-yellow-900/30 text-yellow-400 border-yellow-800",
	merged: "bg-green-900/30 text-green-400 border-green-800",
	conflict: "bg-red-900/30 text-red-400 border-red-800",
	pending: "bg-blue-900/30 text-blue-400 border-blue-800",
};

const stateLabels: Record<WorktreeState, string> = {
	active: "Active",
	merged: "Merged",
	conflict: "Conflict",
	pending: "Pending",
};

export function WorktreeStatus({ run }: WorktreeStatusProps) {
	const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
	const [diffText, setDiffText] = useState<string | null>(null);
	const [showDiff, setShowDiff] = useState(false);
	const [loading, setLoading] = useState(false);

	const state = mergeResult?.conflicted ? "conflict" : getWorktreeState(run);

	const handleViewDiff = async () => {
		if (showDiff) {
			setShowDiff(false);
			return;
		}
		setLoading(true);
		try {
			const diff = await rpc.request.getWorktreeDiff({ runId: run.id });
			setDiffText(diff);
			setShowDiff(true);
		} catch (err) {
			console.error("Failed to get diff:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleMerge = async (strategy?: "auto" | "pr") => {
		setLoading(true);
		try {
			const result = await rpc.request.mergeWorktreeBranch({ runId: run.id, strategy });
			setMergeResult(result);
		} catch (err) {
			console.error("Merge failed:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleCleanup = async () => {
		setLoading(true);
		try {
			await rpc.request.cleanupWorktree({ runId: run.id });
		} catch (err) {
			console.error("Cleanup failed:", err);
		} finally {
			setLoading(false);
		}
	};

	const copyBranch = () => {
		if (run.worktreeBranch) {
			navigator.clipboard.writeText(run.worktreeBranch);
		}
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h4 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">Worktree</h4>
				<span className={`text-[10px] px-1.5 py-0.5 rounded border ${stateStyles[state]}`}>
					{stateLabels[state]}
				</span>
			</div>

			{run.worktreeBranch && (
				<button
					onClick={copyBranch}
					className="w-full text-left text-xs font-mono text-[#58a6ff] bg-[#0d1117] rounded px-2 py-1.5 border border-[#21262d] hover:border-[#58a6ff]/50 transition-colors truncate"
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

			{mergeResult?.prUrl && (
				<p className="text-xs text-green-400">
					PR created: <span className="font-mono">{mergeResult.prUrl}</span>
				</p>
			)}

			{mergeResult?.error && (
				<p className="text-xs text-red-400">{mergeResult.error}</p>
			)}

			{run.worktreePath && (
				<div className="flex flex-wrap gap-1.5">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleViewDiff}
						disabled={loading}
						className="text-xs h-7 text-[#8b949e] hover:text-[#e6edf3]"
					>
						{showDiff ? "Hide Diff" : "View Diff"}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => handleMerge("auto")}
						disabled={loading}
						className="text-xs h-7 text-[#8b949e] hover:text-[#e6edf3]"
					>
						Merge
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => handleMerge("pr")}
						disabled={loading}
						className="text-xs h-7 text-[#8b949e] hover:text-[#e6edf3]"
					>
						Create PR
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleCleanup}
						disabled={loading}
						className="text-xs h-7 text-red-400 hover:text-red-300"
					>
						Cleanup
					</Button>
				</div>
			)}

			{showDiff && diffText && (
				<pre className="text-[10px] font-mono text-[#8b949e] bg-[#0d1117] rounded p-2 border border-[#21262d] max-h-48 overflow-auto whitespace-pre-wrap">
					{diffText}
				</pre>
			)}
		</div>
	);
}
