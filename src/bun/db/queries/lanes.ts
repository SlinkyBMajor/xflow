import { eq, asc } from "drizzle-orm";
import type { DB } from "../connection";
import { lanes, tickets } from "../schema";
import type { Lane } from "../../../shared/types";

function toLane(row: typeof lanes.$inferSelect): Lane {
	return {
		...row,
		allowTicketCreation: row.allowTicketCreation !== 0,
	};
}

export function getLanesByBoard(db: DB, boardId: string): Lane[] {
	return db
		.select()
		.from(lanes)
		.where(eq(lanes.boardId, boardId))
		.orderBy(asc(lanes.order))
		.all()
		.map(toLane);
}

export function createLane(
	db: DB,
	id: string,
	boardId: string,
	name: string,
	color: string | null = null,
): Lane {
	const existing = getLanesByBoard(db, boardId);
	const order = existing.length;
	const row = {
		id,
		boardId,
		name,
		order,
		color,
		wipLimit: null,
		allowTicketCreation: 1,
		workflowId: null,
	};
	db.insert(lanes).values(row).run();
	return toLane(row);
}

export function updateLane(
	db: DB,
	laneId: string,
	updates: { name?: string; color?: string; wipLimit?: number | null; allowTicketCreation?: boolean },
): Lane {
	const setValues: Record<string, unknown> = {};
	if (updates.name !== undefined) setValues.name = updates.name;
	if (updates.color !== undefined) setValues.color = updates.color;
	if (updates.wipLimit !== undefined) setValues.wipLimit = updates.wipLimit;
	if (updates.allowTicketCreation !== undefined) setValues.allowTicketCreation = updates.allowTicketCreation ? 1 : 0;

	if (Object.keys(setValues).length > 0) {
		db.update(lanes).set(setValues).where(eq(lanes.id, laneId)).run();
	}

	return toLane(db.select().from(lanes).where(eq(lanes.id, laneId)).get()!);
}

export function deleteLane(db: DB, laneId: string): void {
	db.delete(tickets).where(eq(tickets.laneId, laneId)).run();
	db.delete(lanes).where(eq(lanes.id, laneId)).run();
}

export function attachWorkflow(db: DB, laneId: string, workflowId: string | null): Lane {
	db.update(lanes).set({ workflowId }).where(eq(lanes.id, laneId)).run();
	return toLane(db.select().from(lanes).where(eq(lanes.id, laneId)).get()!);
}

export function reorderLanes(db: DB, laneIds: string[]): void {
	for (let i = 0; i < laneIds.length; i++) {
		db.update(lanes).set({ order: i }).where(eq(lanes.id, laneIds[i])).run();
	}
}
