import { eq, asc, and } from "drizzle-orm";
import type { DB } from "../connection";
import { tickets, workflowRuns, runEvents } from "../schema";
import type { Ticket } from "../../../shared/types";

function rowToTicket(row: typeof tickets.$inferSelect): Ticket {
	return {
		...row,
		tags: row.tags ? JSON.parse(row.tags) : [],
		metadata: row.metadata ? JSON.parse(row.metadata) : {},
	};
}

export function getTicketsByBoard(db: DB, boardId: string): Ticket[] {
	return db
		.select()
		.from(tickets)
		.where(eq(tickets.boardId, boardId))
		.orderBy(asc(tickets.order))
		.all()
		.map(rowToTicket);
}

export function getTicket(db: DB, ticketId: string): Ticket | undefined {
	const row = db.select().from(tickets).where(eq(tickets.id, ticketId)).get();
	return row ? rowToTicket(row) : undefined;
}

export function createTicket(
	db: DB,
	id: string,
	boardId: string,
	laneId: string,
	title: string,
	body: string | null = null,
	tags: string[] = [],
): Ticket {
	const existing = db
		.select()
		.from(tickets)
		.where(eq(tickets.laneId, laneId))
		.all();
	const order = existing.length;
	const now = new Date().toISOString();

	const row = {
		id,
		boardId,
		laneId,
		title,
		body,
		tags: JSON.stringify(tags),
		metadata: JSON.stringify({}),
		order,
		createdAt: now,
		updatedAt: now,
	};

	db.insert(tickets).values(row).run();
	return rowToTicket(row);
}

export function updateTicket(
	db: DB,
	ticketId: string,
	updates: {
		title?: string;
		body?: string;
		tags?: string[];
		metadata?: Record<string, unknown>;
	},
): Ticket {
	const setValues: Record<string, unknown> = {
		updatedAt: new Date().toISOString(),
	};
	if (updates.title !== undefined) setValues.title = updates.title;
	if (updates.body !== undefined) setValues.body = updates.body;
	if (updates.tags !== undefined) setValues.tags = JSON.stringify(updates.tags);
	if (updates.metadata !== undefined)
		setValues.metadata = JSON.stringify(updates.metadata);

	db.update(tickets).set(setValues).where(eq(tickets.id, ticketId)).run();
	return getTicket(db, ticketId)!;
}

export function deleteTicket(db: DB, ticketId: string): void {
	// Delete run events for all runs belonging to this ticket
	const runs = db.select({ id: workflowRuns.id }).from(workflowRuns).where(eq(workflowRuns.ticketId, ticketId)).all();
	for (const run of runs) {
		db.delete(runEvents).where(eq(runEvents.runId, run.id)).run();
	}
	// Delete workflow runs for this ticket
	db.delete(workflowRuns).where(eq(workflowRuns.ticketId, ticketId)).run();
	// Delete the ticket
	db.delete(tickets).where(eq(tickets.id, ticketId)).run();
}

export function moveTicket(
	db: DB,
	ticketId: string,
	targetLaneId: string,
	targetIndex: number,
): void {
	const ticket = db
		.select()
		.from(tickets)
		.where(eq(tickets.id, ticketId))
		.get();
	if (!ticket) return;

	const sourceLaneId = ticket.laneId;

	// Move the ticket to the target lane
	db.update(tickets)
		.set({
			laneId: targetLaneId,
			order: targetIndex,
			updatedAt: new Date().toISOString(),
		})
		.where(eq(tickets.id, ticketId))
		.run();

	// Reorder source lane (close the gap)
	const sourceTickets = db
		.select()
		.from(tickets)
		.where(and(eq(tickets.laneId, sourceLaneId), eq(tickets.id, ticketId)))
		.all();

	// Get all tickets in source lane except the moved one, reorder
	if (sourceLaneId !== targetLaneId) {
		const remainingSource = db
			.select()
			.from(tickets)
			.where(eq(tickets.laneId, sourceLaneId))
			.orderBy(asc(tickets.order))
			.all();
		for (let i = 0; i < remainingSource.length; i++) {
			db.update(tickets)
				.set({ order: i })
				.where(eq(tickets.id, remainingSource[i].id))
				.run();
		}
	}

	// Reorder target lane
	const targetTickets = db
		.select()
		.from(tickets)
		.where(eq(tickets.laneId, targetLaneId))
		.orderBy(asc(tickets.order))
		.all();

	// Place moved ticket at targetIndex, shift others
	const ordered = targetTickets.filter((t) => t.id !== ticketId);
	ordered.splice(targetIndex, 0, { ...ticket, laneId: targetLaneId } as any);
	for (let i = 0; i < ordered.length; i++) {
		db.update(tickets)
			.set({ order: i })
			.where(eq(tickets.id, ordered[i].id))
			.run();
	}
}

export function reorderTicketsInLane(
	db: DB,
	laneId: string,
	ticketIds: string[],
): void {
	for (let i = 0; i < ticketIds.length; i++) {
		db.update(tickets)
			.set({ order: i })
			.where(eq(tickets.id, ticketIds[i]))
			.run();
	}
}
