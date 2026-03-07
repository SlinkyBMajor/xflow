import { useState, useEffect, useCallback } from "react";
import { rpc, onWorkflowRunUpdated, onRunEventAdded } from "../rpc";
import type { WorkflowRunState, NodeRunStatus } from "../../shared/types";

export function useWorkflowRunState(workflowId: string | null) {
	const [runState, setRunState] = useState<WorkflowRunState | null>(null);

	const fetchActiveRun = useCallback(async () => {
		if (!workflowId) {
			setRunState(null);
			return;
		}
		const state = await rpc.request.getActiveRunForWorkflow({ workflowId });
		setRunState(state);
	}, [workflowId]);

	useEffect(() => {
		fetchActiveRun();
	}, [fetchActiveRun]);

	useEffect(() => {
		const unsubRun = onWorkflowRunUpdated((run) => {
			if (run.workflowId !== workflowId) return;

			if (run.status === "done" || run.status === "aborted") {
				setRunState(null);
				return;
			}

			setRunState((prev) => {
				if (!prev || prev.runId !== run.id) {
					return {
						runId: run.id,
						status: run.status,
						currentNodeId: run.currentNodeId,
						completedNodeIds: [],
						errorNodeId: null,
					};
				}
				return {
					...prev,
					status: run.status,
					currentNodeId: run.currentNodeId,
				};
			});
		});

		const unsubEvent = onRunEventAdded((event) => {
			setRunState((prev) => {
				if (!prev || prev.runId !== event.runId) return prev;

				if (event.type === "NODE_COMPLETED") {
					const nodeId = (event.payload as any)?.nodeId;
					if (nodeId && !prev.completedNodeIds.includes(nodeId)) {
						return {
							...prev,
							completedNodeIds: [...prev.completedNodeIds, nodeId],
						};
					}
				}

				if (event.type === "SCRIPT_ERROR" || event.type === "AGENT_TIMEOUT" || event.type === "SCRIPT_TIMEOUT") {
					return {
						...prev,
						errorNodeId: (event.payload as any)?.nodeId ?? null,
					};
				}

				return prev;
			});
		});

		return () => {
			unsubRun();
			unsubEvent();
		};
	}, [workflowId]);

	const isRunning = runState !== null;

	const getNodeRunStatus = useCallback(
		(nodeId: string): NodeRunStatus => {
			if (!runState) return "idle";
			if (runState.errorNodeId === nodeId) return "error";
			if (runState.currentNodeId === nodeId) return "active";
			if (runState.completedNodeIds.includes(nodeId)) return "completed";
			return "idle";
		},
		[runState],
	);

	return { runState, isRunning, getNodeRunStatus };
}
