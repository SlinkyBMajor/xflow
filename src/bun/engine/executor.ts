import type { DB } from "../db/connection";
import type { WorkflowOutputStatus } from "../../shared/types";
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

export function executeNotify(
	db: DB,
	runId: string,
	title: string,
	body: string,
	context: WorkflowContext,
): void {
	const resolvedTitle = interpolate(title, context) || "XFlow";
	const resolvedBody = interpolate(body, context) || `Workflow notification for "${context.ticket.title}"`;
	// Electrobun's Utils.showNotification uses deprecated NSUserNotificationCenter
	// which doesn't show banners on modern macOS. Use osascript as a reliable fallback.
	const escapedTitle = resolvedTitle.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
	const escapedBody = resolvedBody.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
	Bun.spawn(["osascript", "-e", `display notification "${escapedBody}" with title "${escapedTitle}"`]);
	console.log(`[Workflow ${runId}] NOTIFY: ${resolvedTitle} — ${resolvedBody}`);
	runQueries.insertRunEvent(db, {
		id: crypto.randomUUID(),
		runId,
		type: "NODE_NOTIFY",
		payload: { title: resolvedTitle, body: resolvedBody },
		timestamp: new Date().toISOString(),
	});
}

export function evaluateCondition(
	expression: string,
	context: WorkflowContext,
): boolean {
	const scope = {
		ticket: context.ticket,
		title: context.ticket.title,
		body: context.ticket.body,
		tags: context.ticket.tags,
		metadata: context.ticket.metadata,
		outputs: context.nodeOutputs,
	};
	try {
		const fn = new Function(...Object.keys(scope), `return Boolean(${expression})`);
		return fn(...Object.values(scope));
	} catch {
		return false;
	}
}

export function persistNodeOutput(
	db: DB,
	ticketId: string,
	nodeId: string,
	runId: string,
	output: string,
	status?: WorkflowOutputStatus,
	label?: string,
): void {
	const ticket = ticketQueries.getTicket(db, ticketId);
	if (!ticket) return;

	const existing = (ticket.metadata._workflowOutput as Record<string, unknown>) ?? {};
	const updatedMetadata = {
		...ticket.metadata,
		_workflowOutput: {
			...existing,
			[nodeId]: {
				output: output.slice(0, 10_000),
				runId,
				completedAt: new Date().toISOString(),
				...(status && { status }),
				...(label && { label }),
			},
		},
	};
	ticketQueries.updateTicket(db, ticketId, { metadata: updatedMetadata });
}

export function executeMoveToLane(
	db: DB,
	ticketId: string,
	laneId: string,
): void {
	ticketQueries.moveTicket(db, ticketId, laneId, 0);
}
