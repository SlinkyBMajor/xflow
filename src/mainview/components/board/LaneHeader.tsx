import { useState } from "react";
import type { Lane } from "../../../shared/types";

interface LaneHeaderProps {
	lane: Lane;
	ticketCount: number;
	isOverWip: boolean;
	onEdit: () => void;
	onDelete: () => void;
}

export function LaneHeader({ lane, ticketCount, isOverWip, onEdit, onDelete }: LaneHeaderProps) {
	const [showActions, setShowActions] = useState(false);

	return (
		<div
			className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800/40"
			onMouseEnter={() => setShowActions(true)}
			onMouseLeave={() => setShowActions(false)}
		>
			{/* Color dot */}
			<div
				className="w-2.5 h-2.5 rounded-full flex-shrink-0"
				style={{ backgroundColor: lane.color || "#71717a" }}
			/>

			{/* Lane name */}
			<span className="text-[13px] font-semibold text-zinc-300 flex-1 truncate">
				{lane.name}
			</span>

			{/* Count + WIP */}
			<span
				className={`text-[11px] font-mono tabular-nums ${
					isOverWip ? "text-red-400" : "text-zinc-600"
				}`}
			>
				{ticketCount}
				{lane.wipLimit !== null && `/${lane.wipLimit}`}
			</span>

			{/* Actions */}
			{showActions && (
				<div className="flex items-center gap-0.5 ml-1">
					<button
						onClick={onEdit}
						className="p-1 rounded hover:bg-zinc-700/60 text-zinc-500 hover:text-zinc-300 transition-colors"
					>
						<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
							<path
								d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z"
								stroke="currentColor"
								strokeWidth="1.2"
								strokeLinejoin="round"
							/>
						</svg>
					</button>
					<button
						onClick={onDelete}
						className="p-1 rounded hover:bg-red-900/40 text-zinc-500 hover:text-red-400 transition-colors"
					>
						<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
							<path
								d="M2 3h8M4.5 3V2h3v1M3 3v7.5h6V3"
								stroke="currentColor"
								strokeWidth="1.2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</button>
				</div>
			)}
		</div>
	);
}
