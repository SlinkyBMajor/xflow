import type { DB } from "../db/connection";
import * as ticketQueries from "../db/queries/tickets";
import * as runQueries from "../db/queries/runs";
import { interpolate, type WorkflowContext } from "./interpolate";

export function executeLog(
	db: DB,
	runId: string,
	message: string,
	context: WorkflowContext,
): void {
	const resolved = interpolate(message, context);
	console.log(`[Workflow ${runId}] LOG: ${resolved}`);
	runQueries.insertRunEvent(db, {
		id: crypto.randomUUID(),
		runId,
		type: "NODE_LOG",
		payload: { message: resolved },
		timestamp: new Date().toISOString(),
	});
}

export function executeSetMetadata(
	db: DB,
	ticketId: string,
	key: string,
	value: string,
	context: WorkflowContext,
): Record<string, unknown> {
	const resolvedValue = interpolate(value, context);
	const ticket = ticketQueries.getTicket(db, ticketId);
	if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

	const updatedMetadata = { ...ticket.metadata, [key]: resolvedValue };
	ticketQueries.updateTicket(db, ticketId, { metadata: updatedMetadata });
	return updatedMetadata;
}

export function executeMoveToLane(
	db: DB,
	ticketId: string,
	laneId: string,
): void {
	ticketQueries.moveTicket(db, ticketId, laneId, 0);
}
