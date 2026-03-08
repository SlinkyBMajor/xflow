import { useState } from "react";
import { Button } from "../ui/button";
import { rpc } from "../../rpc";

interface MergeConflictPanelProps {
	runId: string;
	conflictFiles: string[];
	onResolved?: () => void;
}

export function MergeConflictPanel({ runId, conflictFiles, onResolved }: MergeConflictPanelProps) {
	const [loading, setLoading] = useState(false);

	const handleRetryMerge = async () => {
		setLoading(true);
		try {
			const result = await rpc.request.mergeWorktreeBranch({ runId, strategy: "auto" });
			if (result.success) onResolved?.();
		} catch (err) {
			console.error("Retry merge failed:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleCleanup = async () => {
		setLoading(true);
		try {
			await rpc.request.cleanupWorktree({ runId });
			onResolved?.();
		} catch (err) {
			console.error("Cleanup failed:", err);
		} finally {
			setLoading(false);
		}
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
					Retry Merge
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
