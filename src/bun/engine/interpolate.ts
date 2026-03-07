import type { Ticket } from "../../shared/types";

export interface WorkflowContext {
	ticket: Ticket;
	nodeOutputs: Record<string, unknown>;
}

export function interpolate(template: string, context: WorkflowContext): string {
	return template.replace(/\{\{(.+?)\}\}/g, (_match, key: string) => {
		const trimmed = key.trim();

		if (trimmed === "ticketTitle") return context.ticket.title;
		if (trimmed === "ticketId") return context.ticket.id;
		if (trimmed === "ticketLaneId") return context.ticket.laneId;

		if (trimmed.startsWith("ticketMetadata.")) {
			const metaKey = trimmed.slice("ticketMetadata.".length);
			const value = context.ticket.metadata[metaKey];
			return value !== undefined ? String(value) : "";
		}

		if (trimmed.startsWith("nodeOutputs.")) {
			const outputKey = trimmed.slice("nodeOutputs.".length);
			const value = context.nodeOutputs[outputKey];
			return value !== undefined ? String(value) : "";
		}

		return "";
	});
}
