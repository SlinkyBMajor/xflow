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
				setWorktreeRuns((prev) => {
					const next = new Map(prev);
					const existing = next.get(run.ticketId);
					next.set(run.ticketId, {
						run,
						changeSummary: existing?.changeSummary ?? { added: 0, modified: 0, deleted: 0, total: 0 },
					});
					return next;
				});
			} else {
				// worktreePath became null — check if we should remove
				setWorktreeRuns((prev) => {
					if (!prev.has(run.ticketId)) return prev;
					const existing = prev.get(run.ticketId);
					if (existing && existing.run.id === run.id && !run.worktreePath) {
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
	}, []);

	return { worktreeRuns, refreshWorktreeRuns };
}
