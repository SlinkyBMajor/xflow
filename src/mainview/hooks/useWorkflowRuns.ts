import { useState, useEffect, useCallback } from "react";
import { rpc, onWorkflowRunUpdated } from "../rpc";
import type { WorkflowRun } from "../../shared/types";

export function useWorkflowRuns(ticketId: string | null) {
	const [runs, setRuns] = useState<WorkflowRun[]>([]);

	const fetchRuns = useCallback(async () => {
		if (!ticketId) {
			setRuns([]);
			return;
		}
		const data = await rpc.request.getWorkflowRunsForTicket({ ticketId });
		setRuns(data);
	}, [ticketId]);

	useEffect(() => {
		fetchRuns();
	}, [fetchRuns]);

	useEffect(() => {
		if (!ticketId) return;
		return onWorkflowRunUpdated((run) => {
			if (run.ticketId === ticketId) {
				setRuns((prev) => {
					const idx = prev.findIndex((r) => r.id === run.id);
					if (idx >= 0) {
						const next = [...prev];
						next[idx] = run;
						return next;
					}
					return [run, ...prev];
				});
			}
		});
	}, [ticketId]);

	return { runs, refreshRuns: fetchRuns };
}
