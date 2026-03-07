import { memo, type ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";

interface WorkflowNodeShellProps {
	children: ReactNode;
	selected?: boolean;
	accentColor?: string;
	showTargetHandle?: boolean;
	showSourceHandle?: boolean;
	sourceHandles?: { id: string; label: string }[];
}

function WorkflowNodeShellInner({
	children,
	selected,
	accentColor = "#52525b",
	showTargetHandle = true,
	showSourceHandle = true,
	sourceHandles,
}: WorkflowNodeShellProps) {
	return (
		<div
			className={`
				relative bg-zinc-900 border rounded-lg px-4 py-3 min-w-[180px] max-w-[220px]
				transition-colors
				${selected ? "border-violet-500 shadow-lg shadow-violet-500/20" : "border-zinc-700 hover:border-zinc-600"}
			`}
		>
			<div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-lg" style={{ backgroundColor: accentColor }} />
			{showTargetHandle && (
				<Handle type="target" position={Position.Top} className="!bg-zinc-600 !border-zinc-500 !w-2.5 !h-2.5" />
			)}
			{children}
			{sourceHandles ? (
				sourceHandles.map((h, i) => (
					<div key={h.id}>
						<Handle
							type="source"
							position={Position.Bottom}
							id={h.id}
							className="!bg-zinc-600 !border-zinc-500 !w-2.5 !h-2.5"
							style={{ left: `${((i + 1) / (sourceHandles.length + 1)) * 100}%` }}
						/>
						<span
							className="absolute text-[9px] text-zinc-500 font-mono"
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
				<Handle type="source" position={Position.Bottom} className="!bg-zinc-600 !border-zinc-500 !w-2.5 !h-2.5" />
			) : null}
		</div>
	);
}

export const WorkflowNodeShell = memo(WorkflowNodeShellInner);
