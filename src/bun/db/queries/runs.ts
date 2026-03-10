import { eq, desc, and, isNotNull, sql, or, like } from "drizzle-orm";
import type { DB } from "../connection";
import { workflowRuns, runEvents } from "../schema";
import type { WorkflowRun, RunEvent, MergeResult } from "../../../shared/types";

function rowToRun(row: typeof workflowRuns.$inferSelect): WorkflowRun {
	return {
		...row,
		actorSnapshot: row.actorSnapshot ? JSON.parse(row.actorSnapshot) : null,
		mergeResult: row.mergeResult ? JSON.parse(row.mergeResult) as MergeResult : null,
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
	worktreePath?: string | null;
	worktreeBranch?: string | null;
}): WorkflowRun {
	const row = {
		...run,
		actorSnapshot: null,
		finishedAt: null,
		lastCheckpoint: null,
		worktreePath: run.worktreePath ?? null,
		worktreeBranch: run.worktreeBranch ?? null,
		mergeResult: null,
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
		worktreePath?: string | null;
		worktreeBranch?: string | null;
		mergeResult?: MergeResult | null;
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
	if (updates.worktreePath !== undefined) setValues.worktreePath = updates.worktreePath;
	if (updates.worktreeBranch !== undefined) setValues.worktreeBranch = updates.worktreeBranch;
	if (updates.mergeResult !== undefined)
		setValues.mergeResult = updates.mergeResult ? JSON.stringify(updates.mergeResult) : null;

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

export function getActiveRunForWorkflow(db: DB, workflowId: string): WorkflowRun | null {
	const row = db
		.select()
		.from(workflowRuns)
		.where(and(eq(workflowRuns.workflowId, workflowId), eq(workflowRuns.status, "active")))
		.get();
	return row ? rowToRun(row) : null;
}

export function getActiveRunForTicket(db: DB, ticketId: string): WorkflowRun | null {
	const row = db
		.select()
		.from(workflowRuns)
		.where(and(eq(workflowRuns.ticketId, ticketId), eq(workflowRuns.status, "active")))
		.get();
	return row ? rowToRun(row) : null;
}

export function getActiveRuns(db: DB): WorkflowRun[] {
	return db
		.select()
		.from(workflowRuns)
		.where(eq(workflowRuns.status, "active"))
		.all()
		.map(rowToRun);
}

export function getRunsWithWorktrees(db: DB): WorkflowRun[] {
	return db
		.select()
		.from(workflowRuns)
		.where(or(
			isNotNull(workflowRuns.worktreePath),
			isNotNull(workflowRuns.worktreeBranch),
			like(workflowRuns.mergeResult, '%"prUrl"%'),
		))
		.all()
		.map(rowToRun);
}

export function getLatestWorktreeRunForTicket(db: DB, ticketId: string): WorkflowRun | null {
	const row = db
		.select()
		.from(workflowRuns)
		.where(and(
			eq(workflowRuns.ticketId, ticketId),
			isNotNull(workflowRuns.worktreePath),
		))
		.orderBy(desc(workflowRuns.startedAt))
		.get();
	return row ? rowToRun(row) : null;
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
