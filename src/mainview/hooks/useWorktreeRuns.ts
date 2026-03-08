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
		const unsubRun = onWorkflowRunUpdated((run) => {
			if (run.worktreePath) {
				// Re-fetch from backend to get fresh git change summaries
				refreshWorktreeRuns();
			} else {
				// worktreePath became null — remove entry
				setWorktreeRuns((prev) => {
					if (!prev.has(run.ticketId)) return prev;
					const existing = prev.get(run.ticketId);
					if (existing && existing.run.id === run.id) {
						const next = new Map(prev);
						next.delete(run.ticketId);
						return next;
					}
					return prev;
				});
			}
		});

		const unsubCleanup = onWorktreeCleanupDone(({ runId }) => {
			setWorktreeRuns((prev) => {
				const next = new Map(prev);
				for (const [ticketId, info] of next) {
					if (info.run.id === runId) {
						next.delete(ticketId);
						break;
					}
				}
				return next;
			});
		});

		const unsubMerge = onWorktreeMergeResult(({ runId, result }) => {
			if (result.success) {
				setWorktreeRuns((prev) => {
					const next = new Map(prev);
					for (const [ticketId, info] of next) {
						if (info.run.id === runId) {
							next.delete(ticketId);
							break;
						}
					}
					return next;
				});
			}
		});

		return () => { unsubRun(); unsubCleanup(); unsubMerge(); };
	}, [refreshWorktreeRuns]);

	return { worktreeRuns, refreshWorktreeRuns };
}
