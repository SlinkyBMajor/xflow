import { useState, useEffect, useCallback } from "react";
import { rpc, onInterruptedRunsDetected } from "../rpc";
import type { InterruptedRunInfo } from "../../shared/types";

export function useInterruptedRuns() {
	const [interruptedRuns, setInterruptedRuns] = useState<InterruptedRunInfo[]>([]);

	useEffect(() => {
		rpc.request.getInterruptedRuns({}).then(setInterruptedRuns);
	}, []);

	useEffect(() => {
		return onInterruptedRunsDetected((runs) => {
			setInterruptedRuns((prev) => {
				const ids = new Set(prev.map((r) => r.run.id));
				const newRuns = runs.filter((r) => !ids.has(r.run.id));
				return [...prev, ...newRuns];
			});
		});
	}, []);

	const retryRun = useCallback(async (runId: string) => {
		await rpc.request.retryRun({ runId });
		setInterruptedRuns((prev) => prev.filter((r) => r.run.id !== runId));
	}, []);

	const abortRun = useCallback(async (runId: string) => {
		await rpc.request.abortInterruptedRun({ runId });
		setInterruptedRuns((prev) => prev.filter((r) => r.run.id !== runId));
	}, []);

	return {
		interruptedRuns,
		retryRun,
		abortRun,
		dismissed: interruptedRuns.length === 0,
	};
}
