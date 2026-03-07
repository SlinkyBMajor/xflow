import { useState, useEffect } from "react";
import { onWorkflowRunUpdated } from "../rpc";
import type { WorkflowRun } from "../../shared/types";

export function useActiveRuns() {
	const [activeRuns, setActiveRuns] = useState<Map<string, WorkflowRun>>(new Map());

	useEffect(() => {
		return onWorkflowRunUpdated((run) => {
			setActiveRuns((prev) => {
				const next = new Map(prev);
				if (run.status === "active") {
					next.set(run.ticketId, run);
				} else {
					next.delete(run.ticketId);
				}
				return next;
			});
		});
	}, []);

	return activeRuns;
}
