import { useSortable } from "@dnd-kit/react/sortable";
import type { Ticket } from "../../../shared/types";
import { Badge } from "../ui/badge";

interface TicketCardProps {
	ticket: Ticket;
	index: number;
	laneId: string;
	isRunning?: boolean;
	onClick: () => void;
}

export function TicketCard({ ticket, index, laneId, isRunning, onClick }: TicketCardProps) {
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
			className="group relative bg-[#161b22] hover:bg-[#1c2129] border border-[#21262d] hover:border-[#30363d] rounded-lg px-3 py-2.5 cursor-pointer transition-colors duration-100 select-none"
		>
			{isRunning && (
				<span className="absolute top-2 right-2 flex h-2 w-2">
					<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#58a6ff] opacity-75" />
					<span className="relative inline-flex rounded-full h-2 w-2 bg-[#58a6ff]" />
				</span>
			)}
			<div className="text-[13px] font-medium text-[#e6edf3] leading-snug">
				{ticket.title}
			</div>

			{ticket.body && (
				<div className="mt-1 text-[11px] text-[#8b949e] leading-relaxed line-clamp-2">
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
