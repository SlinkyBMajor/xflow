import type { WorkflowIR, IRNodeType } from "./types";

const VALID_NODE_TYPES: Set<string> = new Set<IRNodeType>([
	"start",
	"end",
	"claudeAgent",
	"customScript",
	"notify",
	"waitForApproval",
	"moveToLane",
	"condition",
	"setMetadata",
	"log",
	"gitAction",
]);

export function parseAndValidateIR(raw: unknown): { valid: boolean; errors: string[]; ir?: WorkflowIR } {
	const errors: string[] = [];

	if (raw == null || typeof raw !== "object") {
		return { valid: false, errors: ["Expected a JSON object"] };
	}

	const obj = raw as Record<string, unknown>;

	if (obj.version !== 1) {
		errors.push('Missing or invalid "version" (must be 1)');
	}

	if (!Array.isArray(obj.nodes)) {
		errors.push('"nodes" must be an array');
	}

	if (!Array.isArray(obj.edges)) {
		errors.push('"edges" must be an array');
	}

	// If basic structure is wrong, return early
	if (errors.length > 0) {
		return { valid: false, errors };
	}

	const nodes = obj.nodes as unknown[];
	const edges = obj.edges as unknown[];

	for (let i = 0; i < nodes.length; i++) {
		const n = nodes[i];
		if (n == null || typeof n !== "object") {
			errors.push(`nodes[${i}]: must be an object`);
			continue;
		}
		const node = n as Record<string, unknown>;
		if (typeof node.id !== "string") errors.push(`nodes[${i}]: missing "id" (string)`);
		if (typeof node.type !== "string" || !VALID_NODE_TYPES.has(node.type)) {
			errors.push(`nodes[${i}]: invalid "type" "${String(node.type)}"`);
		}
		const pos = node.position;
		if (pos == null || typeof pos !== "object" || typeof (pos as Record<string, unknown>).x !== "number" || typeof (pos as Record<string, unknown>).y !== "number") {
			errors.push(`nodes[${i}]: "position" must have numeric x and y`);
		}
		if (node.config == null || typeof node.config !== "object") {
			errors.push(`nodes[${i}]: missing "config" (object)`);
		}
	}

	for (let i = 0; i < edges.length; i++) {
		const e = edges[i];
		if (e == null || typeof e !== "object") {
			errors.push(`edges[${i}]: must be an object`);
			continue;
		}
		const edge = e as Record<string, unknown>;
		if (typeof edge.id !== "string") errors.push(`edges[${i}]: missing "id" (string)`);
		if (typeof edge.from !== "string") errors.push(`edges[${i}]: missing "from" (string)`);
		if (typeof edge.to !== "string") errors.push(`edges[${i}]: missing "to" (string)`);
	}

	if (errors.length > 0) {
		return { valid: false, errors };
	}

	// Structure is valid — cast and run graph-level checks
	const ir = raw as WorkflowIR;
	const graphResult = validateIR(ir);
	if (!graphResult.valid) {
		return { valid: false, errors: graphResult.errors };
	}

	return { valid: true, errors: [], ir };
}

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
