import { useState, useEffect, useMemo } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import type { BoardWithLanesAndTickets, Lane as LaneType, Ticket, WorkflowRun, WorktreeRunInfo } from "../../../shared/types";
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
		resetTicket: (id: string) => Promise<void>;
		moveTicket: (ticketId: string, targetLaneId: string, targetIndex: number) => Promise<void>;
		reorderTicketsInLane: (laneId: string, ticketIds: string[]) => Promise<void>;
	};
	refreshBoard: () => Promise<void>;
	onEditWorkflow: (laneId: string, laneName: string, workflowId: string) => void;
	onCreateWorkflowForLane: (laneId: string, laneName: string) => Promise<void>;
	activeRuns: Map<string, WorkflowRun>;
	worktreeRuns?: Map<string, WorktreeRunInfo>;
}

export function KanbanBoard({ boardData, lanes: laneActions, tickets: ticketActions, refreshBoard, onEditWorkflow, onCreateWorkflowForLane, activeRuns, worktreeRuns }: KanbanBoardProps) {
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

	// Lane ordering state
	const initialLaneOrder = useMemo(
		() => [...boardData.lanes].sort((a, b) => a.order - b.order).map((l) => l.id),
		[boardData],
	);
	const [laneOrder, setLaneOrder] = useState(initialLaneOrder);
	useEffect(() => {
		setLaneOrder(initialLaneOrder);
	}, [initialLaneOrder]);

	// Build lookup maps
	const ticketMap = useMemo(() => {
		const map = new Map<string, Ticket>();
		for (const t of boardData.tickets) map.set(t.id, t);
		return map;
	}, [boardData.tickets]);

	const laneMap = useMemo(() => {
		const map = new Map<string, LaneType>();
		for (const l of boardData.lanes) map.set(l.id, l);
		return map;
	}, [boardData.lanes]);

	return (
		<div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden px-5 py-4">
			<DragDropProvider
				onDragOver={(event) => {
					const { source, target } = event.operation;
					if (source?.type === "column") {
						if (!target || target.id === source.id) return;
						setLaneOrder((current) => {
							const from = current.indexOf(String(source.id));
							const to = current.indexOf(String(target.id));
							if (from === -1 || to === -1) return current;
							const next = [...current];
							next.splice(from, 1);
							next.splice(to, 0, String(source.id));
							return next;
						});
						return;
					}
					setItems((current) => move(current, event));
				}}
				onDragEnd={async (event) => {
					const { source } = event.operation;
					if (event.canceled) {
						if (source?.type === "column") setLaneOrder(initialLaneOrder);
						return;
					}
					if (!source) return;

					if (source.type === "column") {
						await laneActions.reorderLanes(laneOrder);
						return;
					}

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
					{laneOrder.map((laneId, index) => {
						const lane = laneMap.get(laneId);
						if (!lane) return null;
						return (
							<Lane
								key={lane.id}
								lane={lane}
								index={index}
								lanes={boardData.lanes}
								tickets={(items[lane.id] || [])
									.map((id) => ticketMap.get(id))
									.filter(Boolean) as Ticket[]}
								laneActions={laneActions}
								ticketActions={ticketActions}
								onEditWorkflow={onEditWorkflow}
								onCreateWorkflowForLane={onCreateWorkflowForLane}
								activeRuns={activeRuns}
								worktreeRuns={worktreeRuns}
							/>
						);
					})}
					<AddLaneButton onAdd={laneActions.createLane} />
				</div>
			</DragDropProvider>
		</div>
	);
}
