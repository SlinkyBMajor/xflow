import { eq } from "drizzle-orm";
import type { DB } from "../db/connection";
import { lanes } from "../db/schema";
import * as workflowQueries from "../db/queries/workflows";
import * as ticketQueries from "../db/queries/tickets";
import * as runQueries from "../db/queries/runs";
import type { WorkflowRun } from "../../shared/types";
import { startRun, abortRun } from "./runner";

export function triggerWorkflowIfAttached(
	db: DB,
	ticketId: string,
	targetLaneId: string,
	notifyFrontend: (run: WorkflowRun) => void,
): void {
	const lane = db.select().from(lanes).where(eq(lanes.id, targetLaneId)).get();
	if (!lane?.workflowId) return;

	// Abort any existing active run for this ticket
	const existingRuns = runQueries.getRunsByTicket(db, ticketId);
	for (const run of existingRuns) {
		if (run.status === "active") {
			abortRun(db, run.id);
		}
	}

	const workflow = workflowQueries.getWorkflowById(db, lane.workflowId);
	if (!workflow) return;

	const ticket = ticketQueries.getTicket(db, ticketId);
	if (!ticket) return;

	startRun(db, ticket, workflow.id, workflow.definition, notifyFrontend);
}
