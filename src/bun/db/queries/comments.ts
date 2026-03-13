import { eq, asc } from "drizzle-orm";
import type { DB } from "../connection";
import { ticketComments } from "../schema";
import type { TicketComment } from "../../../shared/types";

function rowToComment(row: typeof ticketComments.$inferSelect): TicketComment {
	return {
		id: row.id,
		ticketId: row.ticketId,
		body: row.body,
		refNodeId: row.refNodeId,
		refLabel: row.refLabel,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export function getCommentsByTicket(db: DB, ticketId: string): TicketComment[] {
	return db
		.select()
		.from(ticketComments)
		.where(eq(ticketComments.ticketId, ticketId))
		.orderBy(asc(ticketComments.createdAt))
		.all()
		.map(rowToComment);
}

export function createComment(
	db: DB,
	id: string,
	ticketId: string,
	body: string,
	refNodeId?: string,
	refLabel?: string,
): TicketComment {
	const now = new Date().toISOString();
	const row = {
		id,
		ticketId,
		body,
		refNodeId: refNodeId ?? null,
		refLabel: refLabel ?? null,
		createdAt: now,
		updatedAt: null,
	};
	db.insert(ticketComments).values(row).run();
	return rowToComment(row);
}

export function updateComment(db: DB, id: string, body: string): TicketComment {
	const now = new Date().toISOString();
	db.update(ticketComments)
		.set({ body, updatedAt: now })
		.where(eq(ticketComments.id, id))
		.run();
	const row = db.select().from(ticketComments).where(eq(ticketComments.id, id)).get();
	if (!row) throw new Error(`Comment ${id} not found`);
	return rowToComment(row);
}

export function deleteComment(db: DB, id: string): void {
	db.delete(ticketComments).where(eq(ticketComments.id, id)).run();
}

export function deleteCommentsByTicket(db: DB, ticketId: string): void {
	db.delete(ticketComments).where(eq(ticketComments.ticketId, ticketId)).run();
}
