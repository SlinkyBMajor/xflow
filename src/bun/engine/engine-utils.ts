import type { DB } from "../db/connection";
import type { RunEvent } from "../../shared/types";
import * as runQueries from "../db/queries/runs";

export function insertAndEmit(
	db: DB,
	runId: string,
	type: string,
	payload: unknown,
	onEvent?: (event: RunEvent) => void,
): void {
	const event: RunEvent = {
		id: crypto.randomUUID(),
		runId,
		type,
		payload,
		timestamp: new Date().toISOString(),
	};
	runQueries.insertRunEvent(db, event);
	onEvent?.(event);
}

export function createProcessTracker() {
	const active = new Map<string, { kill: () => void }>();
	return {
		register(id: string, proc: { kill: () => void }) {
			active.set(id, proc);
		},
		remove(id: string) {
			active.delete(id);
		},
		kill(id: string) {
			const proc = active.get(id);
			if (proc) {
				proc.kill();
				active.delete(id);
			}
		},
	};
}
