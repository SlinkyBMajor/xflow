import { useCallback } from "react";
import { rpc } from "../rpc";

export function useLanes(refreshBoard: () => Promise<void>) {
	const createLane = useCallback(
		async (name: string, color?: string) => {
			await rpc.request.createLane({ name, color });
			await refreshBoard();
		},
		[refreshBoard],
	);

	const updateLane = useCallback(
		async (id: string, updates: { name?: string; color?: string; wipLimit?: number | null; allowTicketCreation?: boolean }) => {
			await rpc.request.updateLane({ id, ...updates });
			await refreshBoard();
		},
		[refreshBoard],
	);

	const deleteLane = useCallback(
		async (id: string) => {
			await rpc.request.deleteLane({ id });
			await refreshBoard();
		},
		[refreshBoard],
	);

	const reorderLanes = useCallback(
		async (laneIds: string[]) => {
			await rpc.request.reorderLanes({ laneIds });
			await refreshBoard();
		},
		[refreshBoard],
	);

	return { createLane, updateLane, deleteLane, reorderLanes };
}
