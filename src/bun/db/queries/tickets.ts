import { eq, asc, and, desc } from "drizzle-orm";
import type { DB } from "../connection";
import { tickets, workflowRuns, runEvents, ticketComments, lanes } from "../schema";
import type { Ticket, TicketMetadata, TicketDerivedData } from "../../../shared/types";

function deleteTicketRunData(db: DB, ticketId: string): void {
	const runs = db.select({ id: workflowRuns.id }).from(workflowRuns).where(eq(workflowRuns.ticketId, ticketId)).all();
	for (const run of runs) {
		db.delete(runEvents).where(eq(runEvents.runId, run.id)).run();
	}
	db.delete(workflowRuns).where(eq(workflowRuns.ticketId, ticketId)).run();
}

function rowToTicket(row: typeof tickets.$inferSelect): Ticket {
	return {
		...row,
		tags: row.tags ? JSON.parse(row.tags) : [],
		metadata: row.metadata ? JSON.parse(row.metadata) : {},
		laneEnteredAt: row.laneEnteredAt ?? null,
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
		metadata: JSON.stringify({ runCount: 0, agentRunCount: 0, retryCount: 0, abortCount: 0 }),
		order,
		laneEnteredAt: now,
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
		metadata?: TicketMetadata;
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

export function resetTicket(db: DB, ticketId: string): Ticket | undefined {
	deleteTicketRunData(db, ticketId);
	// Reset metadata to initial state
	const now = new Date().toISOString();
	db.update(tickets)
		.set({
			metadata: JSON.stringify({ runCount: 0, agentRunCount: 0, retryCount: 0, abortCount: 0 }),
			tags: JSON.stringify([]),
			laneEnteredAt: now,
			updatedAt: now,
		})
		.where(eq(tickets.id, ticketId))
		.run();
	return getTicket(db, ticketId);
}

export function deleteTicket(db: DB, ticketId: string): void {
	deleteTicketRunData(db, ticketId);
	db.delete(ticketComments).where(eq(ticketComments.ticketId, ticketId)).run();
	db.delete(tickets).where(eq(tickets.id, ticketId)).run();
}

export function deleteAllTickets(db: DB): void {
	db.delete(runEvents).run();
	db.delete(workflowRuns).run();
	db.delete(ticketComments).run();
	db.delete(tickets).run();
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
	const now = new Date().toISOString();
	const laneChanged = sourceLaneId !== targetLaneId;
	db.update(tickets)
		.set({
			laneId: targetLaneId,
			order: targetIndex,
			updatedAt: now,
			...(laneChanged ? { laneEnteredAt: now } : {}),
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

// ── Metadata Helpers ──

export function incrementMetadataCounter(
	db: DB,
	ticketId: string,
	key: string,
): void {
	const row = db.select().from(tickets).where(eq(tickets.id, ticketId)).get();
	if (!row) return;
	const metadata: TicketMetadata = row.metadata ? JSON.parse(row.metadata) : {};
	metadata[key] = ((metadata[key] as number) || 0) + 1;
	db.update(tickets)
		.set({ metadata: JSON.stringify(metadata) })
		.where(eq(tickets.id, ticketId))
		.run();
}

export function setMetadataField(
	db: DB,
	ticketId: string,
	key: string,
	value: unknown,
): void {
	const row = db.select().from(tickets).where(eq(tickets.id, ticketId)).get();
	if (!row) return;
	const metadata: TicketMetadata = row.metadata ? JSON.parse(row.metadata) : {};
	metadata[key] = value;
	db.update(tickets)
		.set({ metadata: JSON.stringify(metadata) })
		.where(eq(tickets.id, ticketId))
		.run();
}

// ── Derived Data Queries ──

function getLastCompletedNodeId(db: DB, ticketId: string): string | null {
	const activeRun = db
		.select()
		.from(workflowRuns)
		.where(and(eq(workflowRuns.ticketId, ticketId), eq(workflowRuns.status, "active")))
		.get();
	if (!activeRun) return null;

	const event = db
		.select()
		.from(runEvents)
		.where(and(eq(runEvents.runId, activeRun.id), eq(runEvents.type, "NODE_COMPLETED")))
		.orderBy(desc(runEvents.timestamp))
		.limit(1)
		.get();
	if (!event?.payload) return null;
	const payload = JSON.parse(event.payload);
	return payload.nodeId ?? null;
}

function getTotalRunDurationMs(db: DB, ticketId: string): number {
	const runs = db
		.select()
		.from(workflowRuns)
		.where(eq(workflowRuns.ticketId, ticketId))
		.all();
	let total = 0;
	for (const run of runs) {
		if (run.startedAt && run.finishedAt) {
			total += new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime();
		}
	}
	return total;
}

function getTotalAgentDurationMs(db: DB, ticketId: string): number {
	const runs = db
		.select({ id: workflowRuns.id })
		.from(workflowRuns)
		.where(eq(workflowRuns.ticketId, ticketId))
		.all();
	let total = 0;
	for (const run of runs) {
		const events = db
			.select()
			.from(runEvents)
			.where(and(eq(runEvents.runId, run.id), eq(runEvents.type, "AGENT_COMPLETED")))
			.all();
		for (const event of events) {
			if (event.payload) {
				const payload = JSON.parse(event.payload);
				total += payload.durationMs ?? 0;
			}
		}
	}
	return total;
}

function getLastAgentOutput(db: DB, ticketId: string): string | null {
	const runs = db
		.select({ id: workflowRuns.id })
		.from(workflowRuns)
		.where(eq(workflowRuns.ticketId, ticketId))
		.orderBy(desc(workflowRuns.startedAt))
		.all();
	for (const run of runs) {
		const event = db
			.select()
			.from(runEvents)
			.where(and(eq(runEvents.runId, run.id), eq(runEvents.type, "AGENT_OUTPUT")))
			.orderBy(desc(runEvents.timestamp))
			.limit(1)
			.get();
		if (event?.payload) {
			const payload = JSON.parse(event.payload);
			return payload.summary ?? null;
		}
	}
	return null;
}

function getLaneHistory(
	db: DB,
	ticketId: string,
): { laneId: string; laneName: string; enteredAt: string; exitedAt: string | null }[] {
	const runs = db
		.select({ id: workflowRuns.id })
		.from(workflowRuns)
		.where(eq(workflowRuns.ticketId, ticketId))
		.all();
	const runIds = runs.map((r) => r.id);
	if (runIds.length === 0) return [];

	const allEvents: { type: string; payload: string | null; timestamp: string }[] = [];
	for (const runId of runIds) {
		const events = db
			.select()
			.from(runEvents)
			.where(and(eq(runEvents.runId, runId), eq(runEvents.type, "LANE_ENTERED")))
			.orderBy(runEvents.timestamp)
			.all();
		allEvents.push(...events.map((e) => ({ type: e.type, payload: e.payload, timestamp: e.timestamp })));

		const exitEvents = db
			.select()
			.from(runEvents)
			.where(and(eq(runEvents.runId, runId), eq(runEvents.type, "LANE_EXITED")))
			.orderBy(runEvents.timestamp)
			.all();
		allEvents.push(...exitEvents.map((e) => ({ type: e.type, payload: e.payload, timestamp: e.timestamp })));
	}

	allEvents.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

	const history: { laneId: string; laneName: string; enteredAt: string; exitedAt: string | null }[] = [];
	const openEntries = new Map<string, number>(); // laneId -> index in history

	for (const event of allEvents) {
		if (!event.payload) continue;
		const payload = JSON.parse(event.payload);
		if (event.type === "LANE_ENTERED") {
			openEntries.set(payload.laneId, history.length);
			history.push({
				laneId: payload.laneId,
				laneName: payload.laneName,
				enteredAt: payload.timestamp ?? event.timestamp,
				exitedAt: null,
			});
		} else if (event.type === "LANE_EXITED") {
			const idx = openEntries.get(payload.laneId);
			if (idx !== undefined) {
				history[idx].exitedAt = payload.timestamp ?? event.timestamp;
				openEntries.delete(payload.laneId);
			}
		}
	}

	return history;
}

function getLaneElapsedMs(db: DB, ticketId: string): number {
	const ticket = db.select().from(tickets).where(eq(tickets.id, ticketId)).get();
	if (!ticket?.laneEnteredAt) return 0;
	return Date.now() - new Date(ticket.laneEnteredAt).getTime();
}

export function getTicketDerivedData(db: DB, ticketId: string): TicketDerivedData {
	return {
		lastCompletedNodeId: getLastCompletedNodeId(db, ticketId),
		totalRunDurationMs: getTotalRunDurationMs(db, ticketId),
		totalAgentDurationMs: getTotalAgentDurationMs(db, ticketId),
		lastAgentOutput: getLastAgentOutput(db, ticketId),
		laneHistory: getLaneHistory(db, ticketId),
		laneElapsedMs: getLaneElapsedMs(db, ticketId),
	};
}
