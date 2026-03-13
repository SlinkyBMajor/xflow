import { setup, assign, fromPromise, type AnyStateMachine } from "xstate";
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
	GitActionConfig,
	RunEvent,
	BoardSettings,
} from "../../shared/types";
import type { WorkflowContext } from "./interpolate";
import { executeLog, executeSetMetadata, executeMoveToLane, executeNotify, evaluateCondition, persistNodeOutput } from "./executor";
import { executeClaudeAgent } from "./agent";
import { executeCustomScript } from "./script";
import { executeGitAction } from "./git-action";

export function compileWorkflow(
	ir: WorkflowIR,
	ticket: Ticket,
	runId: string,
	db: DB,
	notifyFrontend: () => void,
	initialNodeId?: string,
	projectPath?: string,
	notifyEvent?: (event: RunEvent) => void,
	notifyBoardChanged?: () => void,
	apiPort?: number,
	boardSettings?: BoardSettings,
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
			notifyBoardChanged,
			apiPort,
			boardSettings,
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
		notifyBoardChanged?: () => void;
		apiPort?: number;
		boardSettings?: BoardSettings;
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

	// Builds the onDone action array for async nodes. Persists output to DB,
	// updates nodeOutputs, and syncs ticket metadata into XState context — all
	// inside a single assign so ordering is guaranteed regardless of how XState
	// schedules assign vs side-effect actions.
	function makeDoneActions(serializeOutput: (raw: unknown) => string, label?: string) {
		return [
			assign({
				nodeOutputs: ({ context, event }: { context: WorkflowContext; event: any }) => ({
					...context.nodeOutputs,
					[node.id]: event.output,
				}),
				ticket: ({ context, event }: { context: WorkflowContext; event: any }) => {
					const metadata = persistNodeOutput(
						ctx.db, ctx.ticket.id, node.id, ctx.runId,
						serializeOutput(event.output), "success", label,
					);
					ctx.notifyBoardChanged?.();
					return { ...context.ticket, metadata };
				},
			}),
		];
	}

	// Builds the onError action array for async nodes.
	function makeErrorActions(nodeLabel: string, label?: string) {
		return [
			assign({
				ticket: ({ context, event }: { context: WorkflowContext; event: any }) => {
					const errorMsg = event.error?.message ?? String(event.error ?? `Unknown ${nodeLabel} error`);
					const isTimeout = /timed?\s*out|timeout/i.test(errorMsg);
					console.error(`[Workflow ${ctx.runId}] ${nodeLabel} node ${node.id} failed:`, errorMsg);
					const metadata = persistNodeOutput(
						ctx.db, ctx.ticket.id, node.id, ctx.runId,
						`[Error] ${errorMsg}`, isTimeout ? "timeout" : "error", label,
					);
					ctx.notifyBoardChanged?.();
					return { ...context.ticket, metadata };
				},
			}),
		];
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
				entry: [
					assign({
						ticket: ({ context }: { context: WorkflowContext }) => {
							const metadata = executeSetMetadata(
								ctx.db,
								ctx.ticket.id,
								config.key,
								config.value,
								context,
							);
							return { ...context.ticket, metadata };
						},
					}),
				],
				always: targets.length > 0 ? { target: targets[0] } : undefined,
			};
		}

		case "moveToLane": {
			const config = node.config as MoveToLaneConfig & { type: "moveToLane" };
			return {
				invoke: {
					src: fromPromise(async () => {
						executeMoveToLane(ctx.db, ctx.ticket.id, config.laneId);
						ctx.notifyBoardChanged?.();
					}),
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
			const resolvedWorktreeEnabled = config.worktreeEnabled ?? ctx.boardSettings?.defaultWorktreeEnabled;
			const outputLabel = config.outputLabel;
			return {
				invoke: {
					src: fromPromise(({ input }: { input: { context: WorkflowContext } }) => {
						return executeClaudeAgent({
							runId: ctx.runId,
							nodeId: node.id,
							prompt: config.prompt,
							timeoutMs: config.timeoutMs,
							includeWorkflowOutput: config.includeWorkflowOutput,
							worktreeEnabled: resolvedWorktreeEnabled,
							model: config.model,
							maxTurns: config.maxTurns,
							systemPrompt: config.systemPrompt,
							skipPermissions: config.skipPermissions,
							allowedToolsPreset: config.allowedToolsPreset,
							allowedToolsCustom: config.allowedToolsCustom,
							ticket: ctx.ticket,
							context: input.context,
							db: ctx.db,
							projectPath: ctx.projectPath,
							apiPort: ctx.apiPort,
							onEvent: (event: RunEvent) => {
								ctx.notifyEvent?.(event);
								ctx.notifyFrontend();
							},
						});
					}),
					input: ({ context }: { context: WorkflowContext }) => ({ context }),
					onDone: {
						target: targets.length > 0 ? targets[0] : undefined,
						actions: makeDoneActions((raw) => String(raw ?? ""), outputLabel),
					},
					onError: {
						target: targets.length > 0 ? targets[0] : undefined,
						actions: makeErrorActions("Agent", outputLabel),
					},
				},
			};
		}

		case "customScript": {
			const config = node.config as CustomScriptConfig & { type: "customScript" };
			return {
				invoke: {
					src: fromPromise(({ input }: { input: { context: WorkflowContext } }) => {
						return executeCustomScript({
							runId: ctx.runId,
							nodeId: node.id,
							script: config.script,
							interpreter: config.interpreter,
							timeoutMs: config.timeoutMs,
							ticket: ctx.ticket,
							context: input.context,
							db: ctx.db,
							projectPath: ctx.projectPath,
							onEvent: (event: RunEvent) => {
								ctx.notifyEvent?.(event);
								ctx.notifyFrontend();
							},
						});
					}),
					input: ({ context }: { context: WorkflowContext }) => ({ context }),
					onDone: {
						target: targets.length > 0 ? targets[0] : undefined,
						actions: makeDoneActions((raw) => String(raw ?? "")),
					},
					onError: {
						target: targets.length > 0 ? targets[0] : undefined,
						actions: makeErrorActions("Script"),
					},
				},
			};
		}

		case "gitAction": {
			const config = node.config as GitActionConfig & { type: "gitAction" };
			return {
				invoke: {
					src: fromPromise(({ input }: { input: { context: WorkflowContext } }) => {
						return executeGitAction({
							runId: ctx.runId,
							nodeId: node.id,
							config,
							ticket: ctx.ticket,
							context: input.context,
							db: ctx.db,
							projectPath: ctx.projectPath,
							onEvent: (event: RunEvent) => {
								ctx.notifyEvent?.(event);
								ctx.notifyFrontend();
							},
						});
					}),
					input: ({ context }: { context: WorkflowContext }) => ({ context }),
					onDone: {
						target: targets.length > 0 ? targets[0] : undefined,
						actions: makeDoneActions((raw) => JSON.stringify(raw ?? "")),
					},
					onError: {
						target: targets.length > 0 ? targets[0] : undefined,
						actions: makeErrorActions("Git action"),
					},
				},
			};
		}

		default:
			return {
				always: targets.length > 0 ? { target: targets[0] } : undefined,
			};
	}
}
