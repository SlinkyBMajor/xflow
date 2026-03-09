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
	};
	db.insert(ticketComments).values(row).run();
	return rowToComment(row);
}

export function deleteComment(db: DB, id: string): void {
	db.delete(ticketComments).where(eq(ticketComments.id, id)).run();
}
