import { useState } from "react";
import { useDroppable } from "@dnd-kit/react";
import type { Lane as LaneType, Ticket } from "../../../shared/types";
import { LaneHeader } from "./LaneHeader";
import { TicketCard } from "./TicketCard";
import { AddTicketButton } from "./AddTicketButton";
import { LaneSettingsModal } from "../lane/LaneSettingsModal";
import { TicketDetailModal } from "../ticket/TicketDetailModal";

interface LaneProps {
	lane: LaneType;
	tickets: Ticket[];
	laneActions: {
		updateLane: (id: string, updates: { name?: string; color?: string; wipLimit?: number | null }) => Promise<void>;
		deleteLane: (id: string) => Promise<void>;
	};
	ticketActions: {
		createTicket: (laneId: string, title: string, body?: string, tags?: string[]) => Promise<void>;
		updateTicket: (id: string, updates: { title?: string; body?: string; tags?: string[]; metadata?: Record<string, unknown> }) => Promise<void>;
		deleteTicket: (id: string) => Promise<void>;
	};
	onEditWorkflow: (laneId: string, laneName: string, workflowId: string) => void;
	onCreateWorkflowForLane: (laneId: string, laneName: string) => Promise<void>;
}

export function Lane({ lane, tickets, laneActions, ticketActions, onEditWorkflow, onCreateWorkflowForLane }: LaneProps) {
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

	const { ref } = useDroppable({
		id: lane.id,
		type: "column",
	});

	const isOverWip = lane.wipLimit !== null && tickets.length > lane.wipLimit;

	return (
		<>
			<div
				ref={ref}
				className="flex flex-col w-72 flex-shrink-0 bg-zinc-900/50 rounded-xl border border-zinc-800/60 h-fit max-h-full"
			>
				<LaneHeader
					lane={lane}
					ticketCount={tickets.length}
					isOverWip={isOverWip}
					onEdit={() => setSettingsOpen(true)}
					onDelete={() => laneActions.deleteLane(lane.id)}
				/>

				<div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5 min-h-[40px]">
					{tickets.map((ticket, index) => (
						<TicketCard
							key={ticket.id}
							ticket={ticket}
							index={index}
							laneId={lane.id}
							onClick={() => setSelectedTicket(ticket)}
						/>
					))}
				</div>

				<div className="px-2 pb-2">
					<AddTicketButton
						onAdd={(title) => ticketActions.createTicket(lane.id, title)}
					/>
				</div>
			</div>

			<LaneSettingsModal
				open={settingsOpen}
				lane={lane}
				onClose={() => setSettingsOpen(false)}
				onSave={(updates) => {
					laneActions.updateLane(lane.id, updates);
					setSettingsOpen(false);
				}}
				onEditWorkflow={onEditWorkflow}
				onCreateWorkflowForLane={onCreateWorkflowForLane}
			/>

			{selectedTicket && (
				<TicketDetailModal
					open={!!selectedTicket}
					ticket={selectedTicket}
					onClose={() => setSelectedTicket(null)}
					onSave={(updates) => {
						ticketActions.updateTicket(selectedTicket.id, updates);
						setSelectedTicket(null);
					}}
					onDelete={() => {
						ticketActions.deleteTicket(selectedTicket.id);
						setSelectedTicket(null);
					}}
				/>
			)}
		</>
	);
}
