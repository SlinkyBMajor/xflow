import type { Lane, Ticket } from "../../../shared/types";
import { useConfirm } from "../../hooks/useConfirm";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "../ui/context-menu";

interface TicketContextMenuProps {
	ticket: Ticket;
	lanes: Lane[];
	onDelete: (id: string) => void;
	onMove: (ticketId: string, targetLaneId: string) => void;
	children: React.ReactNode;
}

export function TicketContextMenu({ ticket, lanes, onDelete, onMove, children }: TicketContextMenuProps) {
	const confirm = useConfirm();
	const otherLanes = lanes.filter((l) => l.id !== ticket.laneId);

	const handleDelete = async () => {
		const confirmed = await confirm({
			title: "Delete ticket",
			description: `Are you sure you want to delete "${ticket.title}"? This action cannot be undone.`,
			confirmLabel: "Delete",
			variant: "danger",
		});
		if (confirmed) {
			onDelete(ticket.id);
		}
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<div>{children}</div>
			</ContextMenuTrigger>
			<ContextMenuContent>
				{otherLanes.length > 0 && (
					<>
						<ContextMenuSub>
							<ContextMenuSubTrigger>
								<span className="text-[#e6edf3]">Move to</span>
							</ContextMenuSubTrigger>
							<ContextMenuSubContent>
								{otherLanes
									.sort((a, b) => a.order - b.order)
									.map((lane) => (
										<ContextMenuItem
											key={lane.id}
											onClick={() => onMove(ticket.id, lane.id)}
										>
											<span className="flex items-center gap-2 text-[#e6edf3]">
												{lane.color && (
													<span
														className="h-2 w-2 rounded-full flex-shrink-0"
														style={{ backgroundColor: lane.color }}
													/>
												)}
												{lane.name}
											</span>
										</ContextMenuItem>
									))}
							</ContextMenuSubContent>
						</ContextMenuSub>
						<ContextMenuSeparator />
					</>
				)}
				<ContextMenuItem
					onClick={handleDelete}
					className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
				>
					Delete
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
