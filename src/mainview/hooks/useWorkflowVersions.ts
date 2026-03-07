import { useState, useCallback } from "react";
import { rpc } from "../rpc";
import type { WorkflowVersion, Workflow } from "../../shared/types";

export function useWorkflowVersions(workflowId: string) {
	const [versions, setVersions] = useState<WorkflowVersion[]>([]);
	const [loading, setLoading] = useState(false);

	const fetchVersions = useCallback(async () => {
		setLoading(true);
		const result = await rpc.request.listWorkflowVersions({ workflowId });
		setVersions(result);
		setLoading(false);
	}, [workflowId]);

	const restoreVersion = useCallback(
		async (versionId: string): Promise<Workflow> => {
			const workflow = await rpc.request.restoreWorkflowVersion({ workflowId, versionId });
			await fetchVersions();
			return workflow;
		},
		[workflowId, fetchVersions],
	);

	return { versions, loading, fetchVersions, restoreVersion };
}
