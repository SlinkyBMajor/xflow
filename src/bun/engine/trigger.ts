import { eq } from "drizzle-orm";
import type { DB } from "../db/connection";
import { lanes } from "../db/schema";
import * as workflowQueries from "../db/queries/workflows";
import * as ticketQueries from "../db/queries/tickets";
import * as runQueries from "../db/queries/runs";
import type { WorkflowRun, RunEvent } from "../../shared/types";
import { startRun, abortRun } from "./runner";

export function triggerWorkflowIfAttached(
	db: DB,
	ticketId: string,
	targetLaneId: string,
	notifyFrontend: (run: WorkflowRun) => void,
	projectPath?: string,
	notifyEvent?: (event: RunEvent) => void,
	notifyBoardChanged?: () => void,
	apiPort?: number,
	/** Run ID to exclude from the abort sweep (the run that triggered this transition). */
	excludeRunId?: string,
): void {
	const lane = db.select().from(lanes).where(eq(lanes.id, targetLaneId)).get();
	if (!lane?.workflowId) return;

	// Abort any existing active run for this ticket, but skip the run
	// that caused this transition — it will finish naturally.
	const existingRuns = runQueries.getRunsByTicket(db, ticketId);
	for (const run of existingRuns) {
		if (run.status === "active" && run.id !== excludeRunId) {
			abortRun(db, run.id, projectPath);
		}
	}

	const workflow = workflowQueries.getWorkflowById(db, lane.workflowId);
	if (!workflow) return;

	const ticket = ticketQueries.getTicket(db, ticketId);
	if (!ticket) return;

	startRun(db, ticket, workflow.id, workflow.definition, notifyFrontend, projectPath, notifyEvent, notifyBoardChanged, apiPort);
}
