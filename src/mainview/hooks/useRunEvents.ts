import { useState, useEffect, useCallback } from "react";
import { rpc, onRunEventAdded } from "../rpc";
import type { RunEvent } from "../../shared/types";

export function useRunEvents(runId: string | null) {
	const [events, setEvents] = useState<RunEvent[]>([]);

	const fetchEvents = useCallback(async () => {
		if (!runId) {
			setEvents([]);
			return;
		}
		const data = await rpc.request.getRunEvents({ runId });
		setEvents(data);
	}, [runId]);

	useEffect(() => {
		fetchEvents();
	}, [fetchEvents]);

	useEffect(() => {
		if (!runId) return;
		return onRunEventAdded((event) => {
			if (event.runId === runId) {
				setEvents((prev) => [...prev, event]);
			}
		});
	}, [runId]);

	return { events, refreshEvents: fetchEvents };
}
