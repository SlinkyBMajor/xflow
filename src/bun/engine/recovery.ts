import type { DB } from "../db/connection";
import type { InterruptedRunInfo, WorkflowIR, IRNode } from "../../shared/types";
import * as runQueries from "../db/queries/runs";
import * as workflowQueries from "../db/queries/workflows";
import * as ticketQueries from "../db/queries/tickets";

export function detectInterruptedRuns(db: DB): InterruptedRunInfo[] {
	const activeRuns = runQueries.getActiveRuns(db);

	for (const run of activeRuns) {
		runQueries.updateRun(db, run.id, { nodeStatus: "interrupted" });
	}

	return activeRuns.map((run) => buildInterruptedRunInfo(db, run.id));
}

export function getInterruptedRuns(db: DB): InterruptedRunInfo[] {
	const activeRuns = runQueries.getActiveRuns(db);
	return activeRuns
		.filter((run) => run.nodeStatus === "interrupted")
		.map((run) => buildInterruptedRunInfo(db, run.id));
}

function buildInterruptedRunInfo(db: DB, runId: string): InterruptedRunInfo {
	const run = runQueries.getRunById(db, runId)!;
	const ticket = ticketQueries.getTicket(db, run.ticketId);
	const workflow = workflowQueries.getWorkflowById(db, run.workflowId);

	let interruptedNode: IRNode | null = null;
	if (workflow && run.currentNodeId) {
		interruptedNode =
			workflow.definition.nodes.find((n) => n.id === run.currentNodeId) ?? null;
	}

	return {
		run,
		ticketTitle: ticket?.title ?? "Unknown ticket",
		workflowName: workflow?.name ?? "Unknown workflow",
		interruptedNodeLabel: interruptedNode?.label ?? interruptedNode?.type ?? null,
		interruptedNodeType: interruptedNode?.type ?? null,
		autoResumable: interruptedNode?.type === "waitForApproval",
	};
}
