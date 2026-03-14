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
import { interpolate, type WorkflowContext } from "./interpolate";
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
						serializeOutput(event.output), "success", label, node.type,
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
						`[Error] ${errorMsg}`, isTimeout ? "timeout" : "error", label, node.type,
					);
					ctx.notifyBoardChanged?.();
					return { ...context.ticket, metadata };
				},
			}),
		];
	}

	// Nodes that already persist their own output via makeDoneActions/makeErrorActions
	const SELF_PERSISTING = new Set(["claudeAgent", "customScript", "gitAction", "start", "end"]);

	let stateConfig: any;

	switch (node.type) {
		case "start":
			stateConfig = {
				always: targets.length > 0 ? { target: targets[0] } : undefined,
			};
			break;

		case "end":
			stateConfig = { type: "final" as const };
			break;

		case "log": {
			const config = node.config as LogConfig & { type: "log" };
			stateConfig = {
				entry: ({ context }: { context: WorkflowContext }) => {
					executeLog(ctx.db, ctx.runId, config.message, context);
				},
				always: targets.length > 0 ? { target: targets[0] } : undefined,
			};
			break;
		}

		case "setMetadata": {
			const config = node.config as SetMetadataConfig & { type: "setMetadata" };
			stateConfig = {
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
			break;
		}

		case "moveToLane": {
			const config = node.config as MoveToLaneConfig & { type: "moveToLane" };
			stateConfig = {
				invoke: {
					src: fromPromise(async () => {
						executeMoveToLane(ctx.db, ctx.ticket.id, config.laneId);
						ctx.notifyBoardChanged?.();
					}),
					onDone: targets.length > 0 ? { target: targets[0] } : undefined,
					onError: targets.length > 0 ? { target: targets[0] } : undefined,
				},
			};
			break;
		}

		case "waitForApproval": {
			const on: Record<string, any> = {};
			for (const targetId of targets) {
				const label = edgeLabels.get(`${node.id}->${targetId}`) ?? "NEXT";
				on[label] = { target: targetId };
			}
			stateConfig = { on };
			break;
		}

		case "notify": {
			const config = node.config as NotifyConfig & { type: "notify" };
			stateConfig = {
				entry: ({ context }: { context: WorkflowContext }) => {
					executeNotify(ctx.db, ctx.runId, config.title, config.body, context);
					ctx.notifyFrontend();
				},
				always: targets.length > 0 ? { target: targets[0] } : undefined,
			};
			break;
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
			stateConfig = {
				always: alwaysTransitions.length > 0 ? alwaysTransitions : undefined,
			};
			break;
		}

		case "claudeAgent": {
			const config = node.config as ClaudeAgentConfig & { type: "claudeAgent" };
			const resolvedWorktreeEnabled = config.worktreeEnabled ?? ctx.boardSettings?.defaultWorktreeEnabled;
			const outputLabel = config.outputLabel;
			stateConfig = {
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
			break;
		}

		case "customScript": {
			const config = node.config as CustomScriptConfig & { type: "customScript" };
			stateConfig = {
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
			break;
		}

		case "gitAction": {
			const config = node.config as GitActionConfig & { type: "gitAction" };
			stateConfig = {
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
			break;
		}

		default:
			stateConfig = {
				always: targets.length > 0 ? { target: targets[0] } : undefined,
			};
			break;
	}

	// ── Automatic output persistence for non-self-persisting nodes ──
	// Adds an exit action that persists a summary of what the node did.
	// This fires when XState transitions out of the state, so it works
	// uniformly for sync (always), async (invoke), and event-driven (on) nodes.
	if (!SELF_PERSISTING.has(node.type)) {
		const existingExit = stateConfig.exit;
		stateConfig.exit = [
			...(Array.isArray(existingExit) ? existingExit : existingExit ? [existingExit] : []),
			assign({
				ticket: ({ context }: { context: WorkflowContext }) => {
					const summary = deriveSyncNodeOutput(node, context);
					const metadata = persistNodeOutput(
						ctx.db, ctx.ticket.id, node.id, ctx.runId,
						summary, "success", node.label, node.type,
					);
					ctx.notifyBoardChanged?.();
					return { ...context.ticket, metadata };
				},
			}),
		];
	}

	return stateConfig;
}

/**
 * Derives a human-readable output summary for non-async nodes.
 * Each node type produces a short description of what it did.
 */
function deriveSyncNodeOutput(node: IRNode, context: WorkflowContext): string {
	switch (node.type) {
		case "log": {
			const config = node.config as LogConfig & { type: "log" };
			return interpolate(config.message, context);
		}
		case "setMetadata": {
			const config = node.config as SetMetadataConfig & { type: "setMetadata" };
			const value = interpolate(config.value, context);
			return `${config.key} = ${value}`;
		}
		case "notify": {
			const config = node.config as NotifyConfig & { type: "notify" };
			const title = interpolate(config.title, context);
			const body = interpolate(config.body, context);
			return `${title}: ${body}`;
		}
		case "moveToLane": {
			const config = node.config as MoveToLaneConfig & { type: "moveToLane" };
			return `Moved to lane: ${config.laneName}`;
		}
		case "condition": {
			const config = node.config as ConditionConfig & { type: "condition" };
			const result = evaluateCondition(config.expression, context);
			return `${config.expression} \u2192 ${result}`;
		}
		case "waitForApproval":
			return "Approval gate passed";
		default:
			return `${node.type} completed`;
	}
}
