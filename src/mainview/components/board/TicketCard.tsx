import { useSortable } from "@dnd-kit/react/sortable";
import type { Ticket } from "../../../shared/types";
import { Badge } from "../ui/badge";

interface TicketCardProps {
	ticket: Ticket;
	index: number;
	laneId: string;
	onClick: () => void;
}

export function TicketCard({ ticket, index, laneId, onClick }: TicketCardProps) {
	const { ref, isDragging } = useSortable({
		id: ticket.id,
		index,
		group: laneId,
		type: "ticket",
		accept: "ticket",
		transition: {
			duration: 200,
			easing: "cubic-bezier(0.25, 1, 0.5, 1)",
		},
	});

	return (
		<div
			ref={ref}
			data-dragging={isDragging}
			onClick={onClick}
			className="group bg-zinc-900/80 hover:bg-zinc-800/60 border border-zinc-800/60 hover:border-zinc-700/50 rounded-lg px-3 py-2.5 cursor-pointer transition-colors duration-100 select-none"
		>
			<div className="text-[13px] font-medium text-zinc-200 leading-snug">
				{ticket.title}
			</div>

			{ticket.body && (
				<div className="mt-1 text-[11px] text-zinc-500 leading-relaxed line-clamp-2">
					{ticket.body}
				</div>
			)}

			{ticket.tags.length > 0 && (
				<div className="mt-2 flex flex-wrap gap-1">
					{ticket.tags.map((tag) => (
						<Badge key={tag}>{tag}</Badge>
					))}
				</div>
			)}
		</div>
	);
}
