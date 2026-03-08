import { memo, type ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeRunStatus } from "../../../../shared/types";

interface WorkflowNodeShellProps {
	children: ReactNode;
	selected?: boolean;
	accentColor?: string;
	showTargetHandle?: boolean;
	showSourceHandle?: boolean;
	sourceHandles?: { id: string; label: string }[];
	runStatus?: NodeRunStatus;
}

function getRunStatusClasses(runStatus?: NodeRunStatus): string {
	switch (runStatus) {
		case "active":
			return "border-[#58a6ff] animate-pulse shadow-lg shadow-[#58a6ff]/30";
		case "completed":
			return "border-emerald-500/60";
		case "error":
			return "border-red-500 shadow-lg shadow-red-500/20";
		default:
			return "";
	}
}

function WorkflowNodeShellInner({
	children,
	selected,
	accentColor = "#52525b",
	showTargetHandle = true,
	showSourceHandle = true,
	sourceHandles,
	runStatus,
}: WorkflowNodeShellProps) {
	const runClasses = getRunStatusClasses(runStatus);
	const selectionClasses = !runClasses
		? selected
			? "border-[#58a6ff] shadow-lg shadow-[#58a6ff]/20"
			: "border-[#30363d] hover:border-[#484f58]"
		: runClasses;

	return (
		<div
			className={`
				relative bg-[#161b22] border rounded-lg px-4 py-3 min-w-[180px] max-w-[220px]
				transition-colors
				${selectionClasses}
			`}
		>
			{runStatus === "completed" && (
				<div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
					<svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				</div>
			)}
			{showTargetHandle && (
				<Handle type="target" position={Position.Top} className="!bg-[#484f58] !border-[#484f58] !w-2.5 !h-2.5" />
			)}
			{children}
			{sourceHandles ? (
				sourceHandles.map((h, i) => (
					<div key={h.id}>
						<Handle
							type="source"
							position={Position.Bottom}
							id={h.id}
							className="!bg-[#484f58] !border-[#484f58] !w-2.5 !h-2.5"
							style={{ left: `${((i + 1) / (sourceHandles.length + 1)) * 100}%` }}
						/>
						<span
							className="absolute text-[9px] text-[#8b949e] font-mono"
							style={{
								bottom: -16,
								left: `${((i + 1) / (sourceHandles.length + 1)) * 100}%`,
								transform: "translateX(-50%)",
							}}
						>
							{h.label}
						</span>
					</div>
				))
			) : showSourceHandle ? (
				<Handle type="source" position={Position.Bottom} className="!bg-[#484f58] !border-[#484f58] !w-2.5 !h-2.5" />
			) : null}
		</div>
	);
}

export const WorkflowNodeShell = memo(WorkflowNodeShellInner);
