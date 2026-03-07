import { eq, desc } from "drizzle-orm";
import type { DB } from "../connection";
import { workflowRuns, runEvents } from "../schema";
import type { WorkflowRun, RunEvent } from "../../../shared/types";

function rowToRun(row: typeof workflowRuns.$inferSelect): WorkflowRun {
	return {
		...row,
		actorSnapshot: row.actorSnapshot ? JSON.parse(row.actorSnapshot) : null,
	};
}

function rowToEvent(row: typeof runEvents.$inferSelect): RunEvent {
	return {
		...row,
		payload: row.payload ? JSON.parse(row.payload) : null,
	};
}

export function createRun(db: DB, run: {
	id: string;
	ticketId: string;
	workflowId: string;
	status: string;
	nodeStatus: string;
	currentNodeId: string | null;
	startedAt: string;
}): WorkflowRun {
	const row = {
		...run,
		actorSnapshot: null,
		finishedAt: null,
		lastCheckpoint: null,
	};
	db.insert(workflowRuns).values(row).run();
	return rowToRun(row);
}

export function updateRun(
	db: DB,
	id: string,
	updates: {
		status?: string;
		nodeStatus?: string;
		currentNodeId?: string | null;
		actorSnapshot?: unknown;
		finishedAt?: string | null;
		lastCheckpoint?: string | null;
	},
): void {
	const setValues: Record<string, unknown> = {};
	if (updates.status !== undefined) setValues.status = updates.status;
	if (updates.nodeStatus !== undefined) setValues.nodeStatus = updates.nodeStatus;
	if (updates.currentNodeId !== undefined) setValues.currentNodeId = updates.currentNodeId;
	if (updates.actorSnapshot !== undefined)
		setValues.actorSnapshot = JSON.stringify(updates.actorSnapshot);
	if (updates.finishedAt !== undefined) setValues.finishedAt = updates.finishedAt;
	if (updates.lastCheckpoint !== undefined) setValues.lastCheckpoint = updates.lastCheckpoint;

	db.update(workflowRuns).set(setValues).where(eq(workflowRuns.id, id)).run();
}

export function getRunById(db: DB, id: string): WorkflowRun | null {
	const row = db.select().from(workflowRuns).where(eq(workflowRuns.id, id)).get();
	return row ? rowToRun(row) : null;
}

export function getRunsByTicket(db: DB, ticketId: string): WorkflowRun[] {
	return db
		.select()
		.from(workflowRuns)
		.where(eq(workflowRuns.ticketId, ticketId))
		.orderBy(desc(workflowRuns.startedAt))
		.all()
		.map(rowToRun);
}

export function getActiveRuns(db: DB): WorkflowRun[] {
	return db
		.select()
		.from(workflowRuns)
		.where(eq(workflowRuns.status, "active"))
		.all()
		.map(rowToRun);
}

export function insertRunEvent(db: DB, event: {
	id: string;
	runId: string;
	type: string;
	payload: unknown;
	timestamp: string;
}): void {
	db.insert(runEvents)
		.values({
			...event,
			payload: event.payload ? JSON.stringify(event.payload) : null,
		})
		.run();
}

export function getEventsByRun(db: DB, runId: string): RunEvent[] {
	return db
		.select()
		.from(runEvents)
		.where(eq(runEvents.runId, runId))
		.orderBy(runEvents.timestamp)
		.all()
		.map(rowToEvent);
}
