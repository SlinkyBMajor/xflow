import type { Lane } from "../../../shared/types";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface LaneHeaderProps {
	lane: Lane;
	ticketCount: number;
	isOverWip: boolean;
	onEdit: () => void;
	onDelete: () => void;
}

export function LaneHeader({ lane, ticketCount, isOverWip, onEdit, onDelete }: LaneHeaderProps) {
	return (
		<div className="group flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800/40">
			<div
				className="w-2.5 h-2.5 rounded-full flex-shrink-0"
				style={{ backgroundColor: lane.color || "#71717a" }}
			/>

			<span className="text-[13px] font-semibold text-zinc-300 flex-1 truncate">
				{lane.name}
			</span>

			<span
				className={`text-[11px] font-mono tabular-nums ${
					isOverWip ? "text-red-400" : "text-zinc-600"
				}`}
			>
				{ticketCount}
				{lane.wipLimit !== null && `/${lane.wipLimit}`}
			</span>

			<div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							onClick={onEdit}
							className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
						>
							<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
								<path
									d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z"
									stroke="currentColor"
									strokeWidth="1.2"
									strokeLinejoin="round"
								/>
							</svg>
						</Button>
					</TooltipTrigger>
					<TooltipContent>Edit lane</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							onClick={onDelete}
							className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-900/40"
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
						</Button>
					</TooltipTrigger>
					<TooltipContent>Delete lane</TooltipContent>
				</Tooltip>
			</div>
		</div>
	);
}
