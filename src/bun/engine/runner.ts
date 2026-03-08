import { createActor, type AnyActorRef } from "xstate";
import type { DB } from "../db/connection";
import type { Ticket, WorkflowIR, WorkflowRun, RunEvent } from "../../shared/types";
import { compileWorkflow } from "./compiler";
import { killAgentProcess } from "./agent";
import { killScriptProcess } from "./script";
import { removeWorktree } from "../git/worktree";
import * as runQueries from "../db/queries/runs";
import * as workflowQueries from "../db/queries/workflows";
import * as ticketQueries from "../db/queries/tickets";
import * as boardQueries from "../db/queries/boards";

const activeActors = new Map<string, AnyActorRef>();

export function startRun(
	db: DB,
	ticket: Ticket,
	workflowId: string,
	ir: WorkflowIR,
	notifyFrontend: (run: WorkflowRun) => void,
	projectPath?: string,
	notifyEvent?: (event: RunEvent) => void,
	notifyBoardChanged?: () => void,
	apiPort?: number,
): string {
	const runId = crypto.randomUUID();
	const now = new Date().toISOString();

	const startNode = ir.nodes.find((n) => n.type === "start");

	const run = runQueries.createRun(db, {
		id: runId,
		ticketId: ticket.id,
		workflowId,
		status: "active",
		nodeStatus: "running",
		currentNodeId: startNode?.id ?? null,
		startedAt: now,
	});

	// Step 5b: Increment runCount on run start
	ticketQueries.incrementMetadataCounter(db, ticket.id, "runCount");

	const board = boardQueries.getFirstBoard(db);
	const boardSettings = board?.settings ?? undefined;

	const machine = compileWorkflow(ir, ticket, runId, db, () => {
		const updatedRun = runQueries.getRunById(db, runId);
		if (updatedRun) notifyFrontend(updatedRun);
	}, undefined, projectPath, notifyEvent, notifyBoardChanged, apiPort, boardSettings);

	const actor = createActor(machine);

	actor.subscribe((state) => {
		const currentNodeId = typeof state.value === "string" ? state.value : null;
		const checkpoint = new Date().toISOString();

		runQueries.updateRun(db, runId, {
			currentNodeId,
			lastCheckpoint: checkpoint,
			actorSnapshot: state,
		});

		runQueries.insertRunEvent(db, {
			id: crypto.randomUUID(),
			runId,
			type: "NODE_COMPLETED",
			payload: { nodeId: currentNodeId },
			timestamp: checkpoint,
		});

		const updatedRun = runQueries.getRunById(db, runId);
		if (updatedRun) notifyFrontend(updatedRun);

		if (state.status === "done") {
			runQueries.updateRun(db, runId, {
				status: "done",
				nodeStatus: "completed",
				finishedAt: new Date().toISOString(),
			});
			activeActors.delete(runId);
			const finalRun = runQueries.getRunById(db, runId);
			if (finalRun) notifyFrontend(finalRun);
			console.log(`[Workflow ${runId}] Run completed`);
		}

		if (state.status === "error") {
			runQueries.updateRun(db, runId, {
				status: "aborted",
				nodeStatus: "interrupted",
				finishedAt: new Date().toISOString(),
			});
			// Step 5c: Set lastErrorMessage on error
			ticketQueries.setMetadataField(db, ticket.id, "lastErrorMessage", `Workflow run errored at node ${currentNodeId}`);
			activeActors.delete(runId);
			const errorRun = runQueries.getRunById(db, runId);
			if (errorRun) notifyFrontend(errorRun);
			console.error(`[Workflow ${runId}] Run errored`);
		}
	});

	// TODO (Step 5f): When agent nodes are implemented, increment agentRunCount
	// and emit AGENT_STARTED/AGENT_COMPLETED/AGENT_OUTPUT events here.

	activeActors.set(runId, actor);
	actor.start();

	return runId;
}

export function resumeRun(
	db: DB,
	runId: string,
	notifyFrontend: (run: WorkflowRun) => void,
	projectPath?: string,
	notifyEvent?: (event: RunEvent) => void,
	notifyBoardChanged?: () => void,
	apiPort?: number,
): WorkflowRun {
	const run = runQueries.getRunById(db, runId);
	if (!run) throw new Error(`Run ${runId} not found`);

	const workflow = workflowQueries.getWorkflowById(db, run.workflowId);
	if (!workflow) throw new Error(`Workflow ${run.workflowId} not found`);

	const ticket = ticketQueries.getTicket(db, run.ticketId);
	if (!ticket) throw new Error(`Ticket ${run.ticketId} not found`);

	// Step 5e: Increment retryCount on resume
	ticketQueries.incrementMetadataCounter(db, ticket.id, "retryCount");

	const board = boardQueries.getFirstBoard(db);
	const boardSettings = board?.settings ?? undefined;

	const machine = compileWorkflow(
		workflow.definition,
		ticket,
		runId,
		db,
		() => {
			const updatedRun = runQueries.getRunById(db, runId);
			if (updatedRun) notifyFrontend(updatedRun);
		},
		run.currentNodeId ?? undefined,
		projectPath,
		notifyEvent,
		notifyBoardChanged,
		apiPort,
		boardSettings,
	);

	const actor = createActor(machine);

	actor.subscribe((state) => {
		const currentNodeId = typeof state.value === "string" ? state.value : null;
		const checkpoint = new Date().toISOString();

		runQueries.updateRun(db, runId, {
			currentNodeId,
			lastCheckpoint: checkpoint,
			actorSnapshot: state,
		});

		runQueries.insertRunEvent(db, {
			id: crypto.randomUUID(),
			runId,
			type: "NODE_COMPLETED",
			payload: { nodeId: currentNodeId },
			timestamp: checkpoint,
		});

		const updatedRun = runQueries.getRunById(db, runId);
		if (updatedRun) notifyFrontend(updatedRun);

		if (state.status === "done") {
			runQueries.updateRun(db, runId, {
				status: "done",
				nodeStatus: "completed",
				finishedAt: new Date().toISOString(),
			});
			activeActors.delete(runId);
			const finalRun = runQueries.getRunById(db, runId);
			if (finalRun) notifyFrontend(finalRun);
			console.log(`[Workflow ${runId}] Resumed run completed`);
		}

		if (state.status === "error") {
			runQueries.updateRun(db, runId, {
				status: "aborted",
				nodeStatus: "interrupted",
				finishedAt: new Date().toISOString(),
			});
			// Step 5c: Set lastErrorMessage on resumed run error
			ticketQueries.setMetadataField(db, ticket.id, "lastErrorMessage", `Workflow run errored at node ${currentNodeId}`);
			activeActors.delete(runId);
			const errorRun = runQueries.getRunById(db, runId);
			if (errorRun) notifyFrontend(errorRun);
			console.error(`[Workflow ${runId}] Resumed run errored`);
		}
	});

	runQueries.updateRun(db, runId, {
		nodeStatus: "running",
		finishedAt: null,
	});

	runQueries.insertRunEvent(db, {
		id: crypto.randomUUID(),
		runId,
		type: "RUN_RESUMED",
		payload: { currentNodeId: run.currentNodeId },
		timestamp: new Date().toISOString(),
	});

	activeActors.set(runId, actor);
	actor.start();

	console.log(`[Workflow ${runId}] Run resumed at node ${run.currentNodeId}`);
	return runQueries.getRunById(db, runId)!;
}

export function abortRun(db: DB, runId: string, projectPath?: string): void {
	killAgentProcess(runId);
	killScriptProcess(runId);
	const actor = activeActors.get(runId);
	if (actor) {
		actor.stop();
		activeActors.delete(runId);
	}

	// Step 5d: Increment abortCount — fetch ticketId from the run
	const run = runQueries.getRunById(db, runId);
	if (run) {
		ticketQueries.incrementMetadataCounter(db, run.ticketId, "abortCount");

		// Clean up worktree if one was created
		if (run.worktreePath && projectPath) {
			removeWorktree(projectPath, run.worktreePath).catch((err) => {
				console.error(`[Workflow ${runId}] Failed to clean up worktree:`, err);
			});
		}
	}

	runQueries.updateRun(db, runId, {
		status: "aborted",
		nodeStatus: "interrupted",
		finishedAt: new Date().toISOString(),
	});

	runQueries.insertRunEvent(db, {
		id: crypto.randomUUID(),
		runId,
		type: "RUN_ABORTED",
		payload: {},
		timestamp: new Date().toISOString(),
	});

	console.log(`[Workflow ${runId}] Run aborted`);
}

export function sendEventToRun(runId: string, eventType: string): void {
	const actor = activeActors.get(runId);
	if (!actor) throw new Error(`No active actor for run ${runId}`);
	actor.send({ type: eventType });
}

export function getRunSnapshot(db: DB, runId: string): unknown | null {
	const run = runQueries.getRunById(db, runId);
	return run?.actorSnapshot ?? null;
}
