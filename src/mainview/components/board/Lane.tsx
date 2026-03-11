import { useState } from "react";
import { useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import type { Lane as LaneType, Ticket, WorkflowRun, WorktreeRunInfo } from "../../../shared/types";
import { LaneHeader } from "./LaneHeader";
import { TicketCard } from "./TicketCard";
import { AddTicketButton } from "./AddTicketButton";
import { LaneSettingsModal } from "../lane/LaneSettingsModal";
import { TicketDetailModal } from "../ticket/TicketDetailModal";
import { TicketContextMenu } from "../ticket/TicketContextMenu";

interface LaneProps {
	lane: LaneType;
	index: number;
	lanes: LaneType[];
	tickets: Ticket[];
	laneActions: {
		updateLane: (id: string, updates: { name?: string; color?: string; wipLimit?: number | null; allowTicketCreation?: boolean }) => Promise<void>;
		deleteLane: (id: string) => Promise<void>;
	};
	ticketActions: {
		createTicket: (laneId: string, title: string, body?: string, tags?: string[]) => Promise<void>;
		updateTicket: (id: string, updates: { title?: string; body?: string; tags?: string[]; metadata?: Record<string, unknown> }) => Promise<void>;
		deleteTicket: (id: string) => Promise<void>;
		resetTicket: (id: string) => Promise<void>;
		moveTicket: (ticketId: string, targetLaneId: string, targetIndex: number) => Promise<void>;
	};
	onEditWorkflow: (laneId: string, laneName: string, workflowId: string) => void;
	onCreateWorkflowForLane: (laneId: string, laneName: string) => Promise<void>;
	activeRuns: Map<string, WorkflowRun>;
	worktreeRuns?: Map<string, WorktreeRunInfo>;
}

export function Lane({ lane, index, lanes, tickets, laneActions, ticketActions, onEditWorkflow, onCreateWorkflowForLane, activeRuns, worktreeRuns }: LaneProps) {
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
	const selectedTicket = selectedTicketId ? tickets.find((t) => t.id === selectedTicketId) ?? null : null;

	const { ref: sortableRef, handleRef, isDragSource } = useSortable({
		id: lane.id,
		index,
		type: "column",
		accept: "column",
		transition: {
			duration: 200,
			easing: "cubic-bezier(0.25, 1, 0.5, 1)",
		},
	});

	const { ref: droppableRef } = useDroppable({
		id: lane.id,
		type: "column",
	});

	const isOverWip = lane.wipLimit !== null && tickets.length > lane.wipLimit;

	return (
		<>
			<div
				ref={sortableRef}
				className={`flex flex-col w-72 flex-shrink-0 bg-[#161b22]/80 rounded-xl border border-[#21262d] h-fit max-h-full min-h-[115px] ${isDragSource ? "opacity-50" : ""}`}
			>
				<LaneHeader
					lane={lane}
					ticketCount={tickets.length}
					isOverWip={isOverWip}
					onEdit={() => setSettingsOpen(true)}
					onOpenWorkflow={lane.workflowId ? () => onEditWorkflow(lane.id, lane.name, lane.workflowId!) : undefined}
					handleRef={handleRef}
				/>

				<div ref={droppableRef} className="flex-1 overflow-y-auto px-2 pt-2 pb-2 space-y-1.5 min-h-[40px]">
					{tickets.map((ticket, index) => (
						<TicketContextMenu
							key={ticket.id}
							ticket={ticket}
							lanes={lanes}
							onDelete={ticketActions.deleteTicket}
							onReset={ticketActions.resetTicket}
							onMove={(ticketId, targetLaneId) => ticketActions.moveTicket(ticketId, targetLaneId, 0)}
						>
							<TicketCard
								ticket={ticket}
								index={index}
								laneId={lane.id}
								isRunning={activeRuns.has(ticket.id)}
								worktreeInfo={worktreeRuns?.get(ticket.id) ?? null}
								onClick={() => setSelectedTicketId(ticket.id)}
							/>
						</TicketContextMenu>
					))}
				</div>

				{lane.allowTicketCreation !== false && (
				<div className="px-2 pb-2">
					<AddTicketButton
						onAdd={(title) => ticketActions.createTicket(lane.id, title)}
					/>
				</div>
			)}
			</div>

			<LaneSettingsModal
				open={settingsOpen}
				lane={lane}
				onClose={() => setSettingsOpen(false)}
				onSave={(updates) => {
					laneActions.updateLane(lane.id, updates);
					setSettingsOpen(false);
				}}
				onDelete={() => laneActions.deleteLane(lane.id)}
				onEditWorkflow={onEditWorkflow}
				onCreateWorkflowForLane={onCreateWorkflowForLane}
			/>

			{selectedTicket && (
				<TicketDetailModal
					open={!!selectedTicket}
					ticket={selectedTicket}
					laneName={lane.name}
					laneColor={lane.color}
					onClose={() => setSelectedTicketId(null)}
					onSave={(updates) => {
						ticketActions.updateTicket(selectedTicket.id, updates);
						setSelectedTicketId(null);
					}}
					onDelete={() => {
						const id = selectedTicket.id;
						setSelectedTicketId(null);
						ticketActions.deleteTicket(id);
					}}
					onReset={() => {
						ticketActions.resetTicket(selectedTicket.id);
					}}
				/>
			)}
		</>
	);
}
