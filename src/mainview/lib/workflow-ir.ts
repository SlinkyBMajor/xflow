import type { Node, Edge } from "@xyflow/react";
import type { WorkflowIR, IRNode, IREdge, IRNodeType, IRNodeConfig } from "../../shared/types";

export function irToReactFlow(ir: WorkflowIR): { nodes: Node[]; edges: Edge[] } {
	const nodes: Node[] = ir.nodes.map((n) => ({
		id: n.id,
		type: n.type,
		position: n.position,
		data: { label: n.label || getNodeLabel(n.type), config: n.config },
	}));

	const edges: Edge[] = ir.edges.map((e) => ({
		id: e.id,
		source: e.from,
		target: e.to,
		label: e.on,
		type: "smoothstep",
		animated: false,
		style: { stroke: "#52525b" },
	}));

	return { nodes, edges };
}

export function reactFlowToIR(rfNodes: Node[], rfEdges: Edge[]): WorkflowIR {
	const nodes: IRNode[] = rfNodes.map((n) => ({
		id: n.id,
		type: n.type as IRNodeType,
		position: n.position,
		label: n.data.label !== getNodeLabel(n.type as IRNodeType) ? String(n.data.label) : undefined,
		config: n.data.config as IRNodeConfig,
	}));

	const edges: IREdge[] = rfEdges.map((e) => ({
		id: e.id,
		from: e.source,
		to: e.target,
		on: e.label ? String(e.label) : undefined,
	}));

	return { version: 1, nodes, edges };
}

export function createDefaultIR(): WorkflowIR {
	const startId = crypto.randomUUID();
	const endId = crypto.randomUUID();
	return {
		version: 1,
		nodes: [
			{ id: startId, type: "start", position: { x: 250, y: 50 }, config: { type: "start" } },
			{ id: endId, type: "end", position: { x: 250, y: 300 }, config: { type: "end" } },
		],
		edges: [],
	};
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

export function getDefaultConfig(type: IRNodeType): IRNodeConfig {
	switch (type) {
		case "start":
			return { type: "start" };
		case "end":
			return { type: "end" };
		case "claudeAgent":
			return { type: "claudeAgent", prompt: "", timeoutMs: 60000 };
		case "customScript":
			return { type: "customScript", script: "", interpreter: "bun", timeoutMs: 30000 };
		case "notify":
			return { type: "notify", title: "", body: "" };
		case "waitForApproval":
			return { type: "waitForApproval", message: "" };
		case "moveToLane":
			return { type: "moveToLane", laneId: "", laneName: "" };
		case "condition":
			return { type: "condition", expression: "" };
		case "setMetadata":
			return { type: "setMetadata", key: "", value: "" };
		case "log":
			return { type: "log", message: "" };
	}
}

export function getNodeLabel(type: IRNodeType): string {
	const labels: Record<IRNodeType, string> = {
		start: "Entry",
		end: "End",
		claudeAgent: "Claude Agent",
		customScript: "Custom Script",
		notify: "Notify",
		waitForApproval: "Wait for Approval",
		moveToLane: "Move to Lane",
		condition: "Condition",
		setMetadata: "Set Metadata",
		log: "Log",
	};
	return labels[type];
}
