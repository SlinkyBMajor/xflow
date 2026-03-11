import { useCallback } from "react";
import { rpc, onWorkflowRunUpdated } from "../rpc";
import type { WorkflowRun } from "../../shared/types";
import { useRpcListData } from "./useRpcListData";

const upsertRun = (prev: WorkflowRun[], run: WorkflowRun) => {
	const idx = prev.findIndex((r) => r.id === run.id);
	if (idx >= 0) {
		const next = [...prev];
		next[idx] = run;
		return next;
	}
	return [run, ...prev];
};

export function useWorkflowRuns(ticketId: string | null) {
	const fetchFn = useCallback((id: string) => rpc.request.getWorkflowRunsForTicket({ ticketId: id }), []);
	const matchFn = useCallback((run: WorkflowRun, id: string) => run.ticketId === id, []);

	const { data: runs, refresh: refreshRuns } = useRpcListData(
		ticketId,
		fetchFn,
		onWorkflowRunUpdated,
		matchFn,
		upsertRun,
	);

	return { runs, refreshRuns };
}
