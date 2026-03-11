import type { WorkflowIR } from "./types";

export function validateIR(ir: WorkflowIR): { valid: boolean; errors: string[] } {
	const errors: string[] = [];
	const startNodes = ir.nodes.filter((n) => n.type === "start");
	const endNodes = ir.nodes.filter((n) => n.type === "end");

	if (startNodes.length !== 1) errors.push("Workflow must have exactly one Entry node");
	if (endNodes.length === 0) errors.push("Workflow must have at least one End node");

	const nodeIds = new Set(ir.nodes.map((n) => n.id));
	for (const edge of ir.edges) {
		if (!nodeIds.has(edge.from)) errors.push(`Edge "${edge.id}" references unknown source node "${edge.from}"`);
		if (!nodeIds.has(edge.to)) errors.push(`Edge "${edge.id}" references unknown target node "${edge.to}"`);
	}

	return { valid: errors.length === 0, errors };
}
