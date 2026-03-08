import { useState, useEffect, useCallback } from "react";
import type { WorktreeRunInfo } from "../../shared/types";
import { rpc, onWorkflowRunUpdated, onWorktreeCleanupDone, onWorktreeMergeResult } from "../rpc";

export function useWorktreeRuns() {
	const [worktreeRuns, setWorktreeRuns] = useState<Map<string, WorktreeRunInfo>>(new Map());

	const refreshWorktreeRuns = useCallback(async () => {
		try {
			const results = await rpc.request.getWorktreeRuns({});
			const map = new Map<string, WorktreeRunInfo>();
			for (const info of results) {
				map.set(info.run.ticketId, info);
			}
			setWorktreeRuns(map);
		} catch (err) {
			console.error("[useWorktreeRuns] fetch error:", err);
		}
	}, []);

	useEffect(() => {
		refreshWorktreeRuns();
	}, [refreshWorktreeRuns]);

	useEffect(() => {
		const unsubRun = onWorkflowRunUpdated(() => {
			// Always re-fetch — the broadened query handles both active and merged PR runs
			refreshWorktreeRuns();
		});

		const unsubCleanup = onWorktreeCleanupDone(() => {
			refreshWorktreeRuns();
		});

		const unsubMerge = onWorktreeMergeResult(() => {
			refreshWorktreeRuns();
		});

		return () => { unsubRun(); unsubCleanup(); unsubMerge(); };
	}, [refreshWorktreeRuns]);

	return { worktreeRuns, refreshWorktreeRuns };
}
