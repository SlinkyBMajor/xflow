import { useState, useEffect, useMemo } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import type { BoardWithLanesAndTickets, Ticket } from "../../../shared/types";
import { Lane } from "./Lane";
import { AddLaneButton } from "./AddLaneButton";

interface KanbanBoardProps {
	boardData: BoardWithLanesAndTickets;
	lanes: {
		createLane: (name: string, color?: string) => Promise<void>;
		updateLane: (id: string, updates: { name?: string; color?: string; wipLimit?: number | null }) => Promise<void>;
		deleteLane: (id: string) => Promise<void>;
		reorderLanes: (laneIds: string[]) => Promise<void>;
	};
	tickets: {
		createTicket: (laneId: string, title: string, body?: string, tags?: string[]) => Promise<void>;
		updateTicket: (id: string, updates: { title?: string; body?: string; tags?: string[]; metadata?: Record<string, unknown> }) => Promise<void>;
		deleteTicket: (id: string) => Promise<void>;
		moveTicket: (ticketId: string, targetLaneId: string, targetIndex: number) => Promise<void>;
		reorderTicketsInLane: (laneId: string, ticketIds: string[]) => Promise<void>;
	};
	refreshBoard: () => Promise<void>;
	onEditWorkflow: (laneId: string, laneName: string, workflowId: string) => void;
	onCreateWorkflowForLane: (laneId: string, laneName: string) => Promise<void>;
}

export function KanbanBoard({ boardData, lanes: laneActions, tickets: ticketActions, refreshBoard, onEditWorkflow, onCreateWorkflowForLane }: KanbanBoardProps) {
	// Build a map of laneId -> ticketIds for DnD state
	const initialItems = useMemo(() => {
		const map: Record<string, string[]> = {};
		for (const lane of boardData.lanes) {
			map[lane.id] = boardData.tickets
				.filter((t) => t.laneId === lane.id)
				.sort((a, b) => a.order - b.order)
				.map((t) => t.id);
		}
		return map;
	}, [boardData]);

	const [items, setItems] = useState(initialItems);

	// Sync with external board data
	useEffect(() => {
		setItems(initialItems);
	}, [initialItems]);

	// Build a ticket lookup map
	const ticketMap = useMemo(() => {
		const map = new Map<string, Ticket>();
		for (const t of boardData.tickets) map.set(t.id, t);
		return map;
	}, [boardData.tickets]);

	return (
		<div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
			<DragDropProvider
				onDragOver={(event) => {
					const { source } = event.operation;
					if (source?.type === "column") return;
					setItems((current) => move(current, event));
				}}
				onDragEnd={async (event) => {
					if (event.canceled) return;
					const { source } = event.operation;
					if (!source || source.type === "column") return;

					const ticketId = String(source.id);
					// Find which lane the ticket is now in
					for (const [laneId, ticketIds] of Object.entries(items)) {
						const idx = ticketIds.indexOf(ticketId);
						if (idx !== -1) {
							const ticket = ticketMap.get(ticketId);
							if (ticket && ticket.laneId !== laneId) {
								await ticketActions.moveTicket(ticketId, laneId, idx);
								await refreshBoard();
							} else {
								await ticketActions.reorderTicketsInLane(laneId, ticketIds);
							}
							break;
						}
					}
				}}
			>
				<div className="flex gap-3 h-full items-start">
					{boardData.lanes
						.sort((a, b) => a.order - b.order)
						.map((lane) => (
							<Lane
								key={lane.id}
								lane={lane}
								tickets={(items[lane.id] || [])
									.map((id) => ticketMap.get(id))
									.filter(Boolean) as Ticket[]}
								laneActions={laneActions}
								ticketActions={ticketActions}
								onEditWorkflow={onEditWorkflow}
								onCreateWorkflowForLane={onCreateWorkflowForLane}
							/>
						))}
					<AddLaneButton onAdd={laneActions.createLane} />
				</div>
			</DragDropProvider>
		</div>
	);
}
