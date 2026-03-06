import { useSortable } from "@dnd-kit/react/sortable";
import type { Ticket } from "../../../shared/types";

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
			className="group bg-zinc-800/50 hover:bg-zinc-800/80 border border-zinc-700/40 hover:border-zinc-600/50 rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-100 select-none"
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
						<span
							key={tag}
							className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-700/50 text-zinc-400 border border-zinc-700/30"
						>
							{tag}
						</span>
					))}
				</div>
			)}
		</div>
	);
}
