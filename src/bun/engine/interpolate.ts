import type { Ticket } from "../../shared/types";

export interface WorkflowContext {
	ticket: Ticket;
	nodeOutputs: Record<string, unknown>;
}

export function interpolate(template: string, context: WorkflowContext): string {
	let error: Error | null = null;
	const result = template.replace(/\{\{(.+?)\}\}/g, (_match, key: string) => {
		const trimmed = key.trim();

		// ticket.title, ticket.id, ticket.laneId, ticket.body
		if (trimmed === "ticket.title") return context.ticket.title;
		if (trimmed === "ticket.id") return context.ticket.id;
		if (trimmed === "ticket.laneId") return context.ticket.laneId;
		if (trimmed === "ticket.body") return context.ticket.body ?? "";

		// ticket.metadata.KEY
		if (trimmed.startsWith("ticket.metadata.")) {
			const metaKey = trimmed.slice("ticket.metadata.".length);
			const value = context.ticket.metadata[metaKey];
			if (value === undefined) {
				error = new Error(`Unresolved variable: {{${trimmed}}} — key "${metaKey}" not found in ticket metadata`);
				return "";
			}
			return String(value);
		}

		// outputs.NODE_ID
		if (trimmed.startsWith("outputs.")) {
			const outputKey = trimmed.slice("outputs.".length);
			const value = context.nodeOutputs[outputKey];
			if (value === undefined) {
				error = new Error(`Unresolved variable: {{${trimmed}}} — no output found for node "${outputKey}"`);
				return "";
			}
			// Unwrap NodeResult to its output text for interpolation
			if (value && typeof value === "object" && "output" in value) {
				return String((value as any).output ?? "");
			}
			return String(value);
		}

		error = new Error(`Unresolved variable: {{${trimmed}}} — unknown variable pattern. Supported: ticket.title, ticket.id, ticket.laneId, ticket.body, ticket.metadata.KEY, outputs.NODE_ID`);
		return "";
	});
	if (error) throw error;
	return result;
}
