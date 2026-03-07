import type { Lane } from "../../../shared/types";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Workflow, Pencil } from "lucide-react";

interface LaneHeaderProps {
	lane: Lane;
	ticketCount: number;
	isOverWip: boolean;
	onEdit: () => void;
	onOpenWorkflow?: () => void;
}

export function LaneHeader({ lane, ticketCount, isOverWip, onEdit, onOpenWorkflow }: LaneHeaderProps) {
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

			{lane.workflowId && (
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							onClick={onOpenWorkflow}
							className="flex-shrink-0 text-violet-400/60 hover:text-violet-400 transition-colors"
						>
							<Workflow size={14} />
						</button>
					</TooltipTrigger>
					<TooltipContent>Open workflow</TooltipContent>
				</Tooltip>
			)}

			<div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							onClick={onEdit}
							className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
						>
							<Pencil size={12} />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Edit lane</TooltipContent>
				</Tooltip>
			</div>
		</div>
	);
}
