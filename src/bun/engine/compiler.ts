import { setup, type AnyStateMachine } from "xstate";
import type { DB } from "../db/connection";
import type {
	WorkflowIR,
	IRNode,
	Ticket,
	LogConfig,
	SetMetadataConfig,
	MoveToLaneConfig,
} from "../../shared/types";
import type { WorkflowContext } from "./interpolate";
import { executeLog, executeSetMetadata, executeMoveToLane } from "./executor";

export function compileWorkflow(
	ir: WorkflowIR,
	ticket: Ticket,
	runId: string,
	db: DB,
	notifyFrontend: () => void,
	initialNodeId?: string,
): AnyStateMachine {
	const startNode = ir.nodes.find((n) => n.type === "start");
	if (!startNode) throw new Error("Workflow IR missing start node");

	const initialState = initialNodeId ?? startNode.id;

	const edgesFrom = new Map<string, string[]>();
	const edgeLabels = new Map<string, string>();
	for (const edge of ir.edges) {
		const existing = edgesFrom.get(edge.from) ?? [];
		existing.push(edge.to);
		edgesFrom.set(edge.from, existing);
		edgeLabels.set(`${edge.from}->${edge.to}`, edge.on ?? "NEXT");
	}

	const states: Record<string, any> = {};

	for (const node of ir.nodes) {
		states[node.id] = buildState(node, edgesFrom, edgeLabels, {
			ir,
			ticket,
			runId,
			db,
			notifyFrontend,
		});
	}

	const machine = setup({
		types: {
			context: {} as WorkflowContext,
			events: {} as { type: string },
		},
	}).createMachine({
		id: `workflow-${runId}`,
		initial: initialState,
		context: {
			ticket: { ...ticket },
			nodeOutputs: {},
		},
		states,
	});

	return machine;
}

function buildState(
	node: IRNode,
	edgesFrom: Map<string, string[]>,
	edgeLabels: Map<string, string>,
	ctx: {
		ir: WorkflowIR;
		ticket: Ticket;
		runId: string;
		db: DB;
		notifyFrontend: () => void;
	},
): any {
	const targets = edgesFrom.get(node.id) ?? [];

	function makeTransitions(): Record<string, any> {
		const on: Record<string, any> = {};
		for (const targetId of targets) {
			const label = edgeLabels.get(`${node.id}->${targetId}`) ?? "NEXT";
			on[label] = { target: targetId };
		}
		return on;
	}

	switch (node.type) {
		case "start":
			return {
				always: targets.length > 0 ? { target: targets[0] } : undefined,
			};

		case "end":
			return { type: "final" as const };

		case "log": {
			const config = node.config as LogConfig & { type: "log" };
			return {
				entry: ({ context }: { context: WorkflowContext }) => {
					executeLog(ctx.db, ctx.runId, config.message, context);
				},
				always: targets.length > 0 ? { target: targets[0] } : undefined,
			};
		}

		case "setMetadata": {
			const config = node.config as SetMetadataConfig & { type: "setMetadata" };
			return {
				entry: ({
					context,
				}: {
					context: WorkflowContext;
				}) => {
					const updatedMeta = executeSetMetadata(
						ctx.db,
						ctx.ticket.id,
						config.key,
						config.value,
						context,
					);
					context.ticket = {
						...context.ticket,
						metadata: updatedMeta,
					};
				},
				always: targets.length > 0 ? { target: targets[0] } : undefined,
			};
		}

		case "moveToLane": {
			const config = node.config as MoveToLaneConfig & { type: "moveToLane" };
			return {
				invoke: {
					src: () => {
						executeMoveToLane(ctx.db, ctx.ticket.id, config.laneId);
						return Promise.resolve();
					},
					onDone: targets.length > 0 ? { target: targets[0] } : undefined,
					onError: targets.length > 0 ? { target: targets[0] } : undefined,
				},
			};
		}

		case "waitForApproval": {
			const on: Record<string, any> = {};
			for (const targetId of targets) {
				const label = edgeLabels.get(`${node.id}->${targetId}`) ?? "NEXT";
				on[label] = { target: targetId };
			}
			return { on };
		}

		// Phase 5 stubs
		case "claudeAgent":
		case "customScript":
		case "notify":
		case "condition": {
			return {
				entry: () => {
					console.log(
						`[Workflow ${ctx.runId}] Node type "${node.type}" not implemented — skipping`,
					);
				},
				always: targets.length > 0 ? { target: targets[0] } : undefined,
			};
		}

		default:
			return {
				always: targets.length > 0 ? { target: targets[0] } : undefined,
			};
	}
}
