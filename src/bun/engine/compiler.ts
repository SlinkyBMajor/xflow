import { setup, assign, type AnyStateMachine } from "xstate";
import type { DB } from "../db/connection";
import type {
	WorkflowIR,
	IRNode,
	Ticket,
	LogConfig,
	SetMetadataConfig,
	MoveToLaneConfig,
	NotifyConfig,
	ConditionConfig,
	ClaudeAgentConfig,
	CustomScriptConfig,
	RunEvent,
} from "../../shared/types";
import type { WorkflowContext } from "./interpolate";
import { executeLog, executeSetMetadata, executeMoveToLane, executeNotify, evaluateCondition } from "./executor";
import { executeClaudeAgent } from "./agent";
import { executeCustomScript } from "./script";

export function compileWorkflow(
	ir: WorkflowIR,
	ticket: Ticket,
	runId: string,
	db: DB,
	notifyFrontend: () => void,
	initialNodeId?: string,
	projectPath?: string,
	notifyEvent?: (event: RunEvent) => void,
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
			projectPath,
			notifyEvent,
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
		projectPath?: string;
		notifyEvent?: (event: RunEvent) => void;
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

		case "notify": {
			const config = node.config as NotifyConfig & { type: "notify" };
			return {
				entry: ({ context }: { context: WorkflowContext }) => {
					executeNotify(ctx.db, ctx.runId, config.title, config.body, context);
					ctx.notifyFrontend();
				},
				always: targets.length > 0 ? { target: targets[0] } : undefined,
			};
		}

		case "condition": {
			const config = node.config as ConditionConfig & { type: "condition" };
			const trueTarget = targets.find(
				(t) => edgeLabels.get(`${node.id}->${t}`) === "TRUE",
			);
			const falseTarget = targets.find(
				(t) => edgeLabels.get(`${node.id}->${t}`) === "FALSE",
			);
			const alwaysTransitions: any[] = [];
			if (trueTarget) {
				alwaysTransitions.push({
					target: trueTarget,
					guard: ({ context }: { context: WorkflowContext }) =>
						evaluateCondition(config.expression, context),
				});
			}
			if (falseTarget) {
				alwaysTransitions.push({
					target: falseTarget,
					guard: ({ context }: { context: WorkflowContext }) =>
						!evaluateCondition(config.expression, context),
				});
			}
			return {
				always: alwaysTransitions.length > 0 ? alwaysTransitions : undefined,
			};
		}

		case "claudeAgent": {
			const config = node.config as ClaudeAgentConfig & { type: "claudeAgent" };
			return {
				invoke: {
					src: ({ context }: { context: WorkflowContext }) => {
						return executeClaudeAgent({
							runId: ctx.runId,
							nodeId: node.id,
							prompt: config.prompt,
							timeoutMs: config.timeoutMs,
							ticket: ctx.ticket,
							context,
							db: ctx.db,
							projectPath: ctx.projectPath,
							onEvent: (event: RunEvent) => {
								ctx.notifyEvent?.(event);
								ctx.notifyFrontend();
							},
						});
					},
					onDone: {
						target: targets.length > 0 ? targets[0] : undefined,
						actions: assign({
							nodeOutputs: ({ context, event }: { context: WorkflowContext; event: any }) => ({
								...context.nodeOutputs,
								[node.id]: event.output,
							}),
						}),
					},
					onError: targets.length > 0 ? { target: targets[0] } : undefined,
				},
			};
		}

		case "customScript": {
			const config = node.config as CustomScriptConfig & { type: "customScript" };
			return {
				invoke: {
					src: ({ context }: { context: WorkflowContext }) => {
						return executeCustomScript({
							runId: ctx.runId,
							nodeId: node.id,
							script: config.script,
							interpreter: config.interpreter,
							timeoutMs: config.timeoutMs,
							ticket: ctx.ticket,
							context,
							db: ctx.db,
							projectPath: ctx.projectPath,
							onEvent: (event: RunEvent) => {
								ctx.notifyEvent?.(event);
								ctx.notifyFrontend();
							},
						});
					},
					onDone: {
						target: targets.length > 0 ? targets[0] : undefined,
						actions: assign({
							nodeOutputs: ({ context, event }: { context: WorkflowContext; event: any }) => ({
								...context.nodeOutputs,
								[node.id]: event.output,
							}),
						}),
					},
					onError: targets.length > 0 ? { target: targets[0] } : undefined,
				},
			};
		}

		default:
			return {
				always: targets.length > 0 ? { target: targets[0] } : undefined,
			};
	}
}
