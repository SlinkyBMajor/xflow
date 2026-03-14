import type { WorkflowOutputEntry } from "../../shared/types";

/**
 * Normalizes raw `_workflowOutput` metadata into a flat array of entries.
 * Handles both array (new) and object (old) formats.
 */
export function normalizeWorkflowOutput(raw: unknown): WorkflowOutputEntry[] {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw as WorkflowOutputEntry[];
	if (typeof raw === "object") {
		// Old format: Record<nodeId, entry>
		return Object.entries(raw as Record<string, any>).map(([nodeId, entry]) => ({
			...entry,
			nodeId,
		}));
	}
	return [];
}
