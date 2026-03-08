import { useEffect } from "react";
import type { WorkflowVersion } from "../../../shared/types";
import { useWorkflowVersions } from "../../hooks/useWorkflowVersions";
import { Button } from "../ui/button";

interface VersionHistoryProps {
	workflowId: string;
	onRestore: (versionId: string) => void;
	onClose: () => void;
}

function formatTimestamp(iso: string): string {
	const date = new Date(iso);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60_000);

	if (diffMins < 1) return "Just now";
	if (diffMins < 60) return `${diffMins}m ago`;

	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return `${diffHours}h ago`;

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) return `${diffDays}d ago`;

	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function VersionHistory({ workflowId, onRestore, onClose }: VersionHistoryProps) {
	const { versions, loading, fetchVersions } = useWorkflowVersions(workflowId);

	useEffect(() => {
		fetchVersions();
	}, [fetchVersions]);

	return (
		<div className="w-64 bg-[#161b22]/50 border-l border-[#21262d] p-4 overflow-y-auto">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-[13px] font-semibold text-[#e6edf3]">Version History</h3>
				<button
					onClick={onClose}
					className="text-[#8b949e] hover:text-[#e6edf3] text-sm"
				>
					&times;
				</button>
			</div>

			{loading && (
				<p className="text-xs text-[#8b949e]">Loading...</p>
			)}

			{!loading && versions.length === 0 && (
				<p className="text-xs text-[#8b949e]">No previous versions yet. Versions are created automatically when you save.</p>
			)}

			<div className="space-y-2">
				{versions.map((v) => (
					<VersionEntry
						key={v.id}
						version={v}
						onRestore={() => onRestore(v.id)}
					/>
				))}
			</div>
		</div>
	);
}

function VersionEntry({ version, onRestore }: { version: WorkflowVersion; onRestore: () => void }) {
	return (
		<div className="p-2.5 rounded-md bg-[#21262d]/50 border border-[#21262d] hover:border-[#30363d] transition-colors">
			<div className="flex items-center justify-between">
				<span className="text-xs font-medium text-[#e6edf3]">v{version.version}</span>
				<span className="text-[10px] text-[#8b949e]">{formatTimestamp(version.createdAt)}</span>
			</div>
			{version.label && (
				<p className="text-xs text-[#8b949e] mt-1">{version.label}</p>
			)}
			<p className="text-[10px] text-[#8b949e] mt-1">
				{version.definition.nodes.length} nodes, {version.definition.edges.length} edges
			</p>
			<Button
				variant="ghost"
				size="sm"
				onClick={onRestore}
				className="w-full mt-2 h-6 text-xs text-[#58a6ff] hover:text-[#79c0ff] hover:bg-[#58a6ff]/10"
			>
				Restore
			</Button>
		</div>
	);
}
