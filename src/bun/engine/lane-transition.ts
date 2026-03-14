import type { DB } from "../db/connection";
import type { WorkflowRun, RunEvent } from "../../shared/types";
import * as ticketQueries from "../db/queries/tickets";
import * as runQueries from "../db/queries/runs";
import { triggerWorkflowIfAttached } from "./trigger";

export interface LaneTransitionCallbacks {
	notifyRunUpdated: (run: WorkflowRun) => void;
	notifyEvent?: (event: RunEvent) => void;
	notifyBoardChanged?: () => void;
}

/**
 * Central entry point for all ticket lane transitions.
 *
 * Handles the full lifecycle: DB move, lane exit/enter events,
 * frontend notification, and destination-lane workflow triggering.
 *
 * Both the RPC moveTicket handler and the moveToLane workflow node
 * must call this function — never assemble the steps ad hoc.
 */
export function transitionTicketToLane(opts: {
	db: DB;
	ticketId: string;
	targetLaneId: string;
	targetIndex?: number;
	/** The run that caused this transition. It will NOT be aborted. */
	callingRunId?: string;
	projectPath?: string;
	apiPort?: number;
	callbacks: LaneTransitionCallbacks;
}): void {
	const { db, ticketId, targetLaneId, callbacks } = opts;
	const targetIndex = opts.targetIndex ?? 0;

	// 1. Capture source lane before the move
	const ticketBefore = ticketQueries.getTicket(db, ticketId);
	const sourceLaneId = ticketBefore?.laneId;

	// 2. Move ticket in DB
	ticketQueries.moveTicket(db, ticketId, targetLaneId, targetIndex);

	// 3. Emit lane exit/enter events if lane actually changed
	if (sourceLaneId && sourceLaneId !== targetLaneId) {
		emitLaneTransitionEvents(db, ticketId, sourceLaneId, targetLaneId);
	}

	// 4. Notify frontend
	callbacks.notifyBoardChanged?.();

	// 5. Trigger destination lane's workflow (if attached),
	//    skipping the calling run so it can finish naturally
	triggerWorkflowIfAttached(
		db,
		ticketId,
		targetLaneId,
		callbacks.notifyRunUpdated,
		opts.projectPath,
		callbacks.notifyEvent,
		callbacks.notifyBoardChanged,
		opts.apiPort,
		opts.callingRunId,
	);
}

/**
 * Records LANE_EXITED / LANE_ENTERED events on the ticket's active run.
 * These events provide an audit trail of lane transitions during execution.
 */
function emitLaneTransitionEvents(
	db: DB,
	ticketId: string,
	sourceLaneId: string,
	targetLaneId: string,
): void {
	const activeRun = runQueries.getActiveRunForTicket(db, ticketId);
	if (!activeRun) return;

	const now = new Date().toISOString();

	runQueries.insertRunEvent(db, {
		id: crypto.randomUUID(),
		runId: activeRun.id,
		type: "LANE_EXITED",
		payload: { laneId: sourceLaneId, timestamp: now },
		timestamp: now,
	});

	runQueries.insertRunEvent(db, {
		id: crypto.randomUUID(),
		runId: activeRun.id,
		type: "LANE_ENTERED",
		payload: { laneId: targetLaneId, timestamp: now },
		timestamp: now,
	});
}
