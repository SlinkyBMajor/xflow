import { useCallback } from "react";
import { rpc, onRunEventAdded } from "../rpc";
import type { RunEvent } from "../../shared/types";
import { useRpcListData } from "./useRpcListData";

const appendEvent = (prev: RunEvent[], item: RunEvent) => [...prev, item];

export function useRunEvents(runId: string | null) {
	const fetchFn = useCallback((id: string) => rpc.request.getRunEvents({ runId: id }), []);
	const matchFn = useCallback((event: RunEvent, id: string) => event.runId === id, []);

	const { data: events, refresh: refreshEvents } = useRpcListData(
		runId,
		fetchFn,
		onRunEventAdded,
		matchFn,
		appendEvent,
	);

	return { events, refreshEvents };
}
