import { createActor, type AnyActorRef } from "xstate";
import type { DB } from "../db/connection";
import type { Ticket, WorkflowIR, WorkflowRun } from "../../shared/types";
import { compileWorkflow } from "./compiler";
import * as runQueries from "../db/queries/runs";

const activeActors = new Map<string, AnyActorRef>();

export function startRun(
	db: DB,
	ticket: Ticket,
	workflowId: string,
	ir: WorkflowIR,
	notifyFrontend: (run: WorkflowRun) => void,
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

	const machine = compileWorkflow(ir, ticket, runId, db, () => {
		const updatedRun = runQueries.getRunById(db, runId);
		if (updatedRun) notifyFrontend(updatedRun);
	});

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
			activeActors.delete(runId);
			const errorRun = runQueries.getRunById(db, runId);
			if (errorRun) notifyFrontend(errorRun);
			console.error(`[Workflow ${runId}] Run errored`);
		}
	});

	activeActors.set(runId, actor);
	actor.start();

	return runId;
}

export function abortRun(db: DB, runId: string): void {
	const actor = activeActors.get(runId);
	if (actor) {
		actor.stop();
		activeActors.delete(runId);
	}

	runQueries.updateRun(db, runId, {
		status: "aborted",
		nodeStatus: "interrupted",
		finishedAt: new Date().toISOString(),
	});

	console.log(`[Workflow ${runId}] Run aborted`);
}

export function getRunSnapshot(db: DB, runId: string): unknown | null {
	const run = runQueries.getRunById(db, runId);
	return run?.actorSnapshot ?? null;
}
