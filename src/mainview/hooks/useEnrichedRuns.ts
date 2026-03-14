import { useState, useEffect, useCallback } from "react";
import { rpc, onWorkflowRunUpdated } from "../rpc";
import type { EnrichedWorkflowRun } from "../../shared/types";

export function useEnrichedRuns(ticketId: string | null) {
	const [enrichedRuns, setEnrichedRuns] = useState<EnrichedWorkflowRun[]>([]);

	const refresh = useCallback(async () => {
		if (!ticketId) {
			setEnrichedRuns([]);
			return;
		}
		const result = await rpc.request.getEnrichedRunsForTicket({ ticketId });
		setEnrichedRuns(result);
	}, [ticketId]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	// Re-fetch when any run for this ticket updates
	useEffect(() => {
		if (!ticketId) return;
		return onWorkflowRunUpdated((run) => {
			if (run.ticketId === ticketId) {
				refresh();
			}
		});
	}, [ticketId, refresh]);

	return { enrichedRuns, refreshRuns: refresh };
}
