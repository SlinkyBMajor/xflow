import { useCallback } from "react";
import { rpc } from "../rpc";
import type { Workflow, WorkflowIR } from "../../shared/types";

export function useWorkflow() {
	const getWorkflow = useCallback(async (id: string): Promise<Workflow | null> => {
		return await rpc.request.getWorkflow({ id });
	}, []);

	const listWorkflows = useCallback(async (): Promise<Workflow[]> => {
		return await rpc.request.listWorkflows({});
	}, []);

	const createWorkflow = useCallback(async (name: string): Promise<Workflow> => {
		return await rpc.request.createWorkflow({ name });
	}, []);

	const updateWorkflow = useCallback(
		async (id: string, updates: { name?: string; definition?: WorkflowIR }) => {
			return await rpc.request.updateWorkflow({ id, ...updates });
		},
		[],
	);

	const deleteWorkflow = useCallback(async (id: string) => {
		await rpc.request.deleteWorkflow({ id });
	}, []);

	const attachWorkflowToLane = useCallback(async (laneId: string, workflowId: string | null) => {
		return await rpc.request.attachWorkflowToLane({ laneId, workflowId });
	}, []);

	return { getWorkflow, listWorkflows, createWorkflow, updateWorkflow, deleteWorkflow, attachWorkflowToLane };
}
