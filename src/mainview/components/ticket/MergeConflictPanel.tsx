import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { rpc, onWorktreeMergeResult, onWorktreeCleanupDone } from "../../rpc";

interface MergeConflictPanelProps {
	runId: string;
	conflictFiles: string[];
	onResolved?: () => void;
}

export function MergeConflictPanel({ runId, conflictFiles, onResolved }: MergeConflictPanelProps) {
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const unsubMerge = onWorktreeMergeResult(({ runId: id, result }) => {
			if (id !== runId) return;
			setLoading(false);
			if (result.success) onResolved?.();
		});
		const unsubCleanup = onWorktreeCleanupDone(({ runId: id }) => {
			if (id !== runId) return;
			setLoading(false);
			onResolved?.();
		});
		return () => { unsubMerge(); unsubCleanup(); };
	}, [runId, onResolved]);

	const handleRetryMerge = () => {
		setLoading(true);
		rpc.request.mergeWorktreeBranch({ runId, strategy: "auto" });
	};

	const handleCleanup = () => {
		setLoading(true);
		rpc.request.cleanupWorktree({ runId });
	};

	return (
		<div className="bg-red-950/20 border border-red-900/40 rounded-md p-3 space-y-3">
			<h4 className="text-xs font-semibold text-red-400">Merge Conflicts</h4>

			<ul className="space-y-1">
				{conflictFiles.map((file) => (
					<li key={file} className="text-[11px] font-mono text-[#e6edf3] truncate">
						{file}
					</li>
				))}
			</ul>

			<p className="text-[11px] text-[#8b949e]">
				Resolve conflicts in your terminal, then retry the merge.
			</p>

			<div className="flex gap-2">
				<Button
					variant="ghost"
					size="sm"
					onClick={handleRetryMerge}
					disabled={loading}
					className="text-xs h-7 text-[#58a6ff] hover:text-[#79c0ff]"
				>
					{loading ? "Working..." : "Retry Merge"}
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={handleCleanup}
					disabled={loading}
					className="text-xs h-7 text-red-400 hover:text-red-300"
				>
					Abort & Cleanup
				</Button>
			</div>
		</div>
	);
}
