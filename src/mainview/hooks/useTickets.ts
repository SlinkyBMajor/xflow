import { useCallback } from "react";
import { rpc } from "../rpc";

export function useTickets(refreshBoard: () => Promise<void>) {
	const createTicket = useCallback(
		async (laneId: string, title: string, body?: string, tags?: string[]) => {
			await rpc.request.createTicket({ laneId, title, body, tags });
			await refreshBoard();
		},
		[refreshBoard],
	);

	const updateTicket = useCallback(
		async (
			id: string,
			updates: { title?: string; body?: string; tags?: string[]; metadata?: Record<string, unknown> },
		) => {
			await rpc.request.updateTicket({ id, ...updates });
			await refreshBoard();
		},
		[refreshBoard],
	);

	const deleteTicket = useCallback(
		async (id: string) => {
			await rpc.request.deleteTicket({ id });
			await refreshBoard();
		},
		[refreshBoard],
	);

	const moveTicket = useCallback(
		async (ticketId: string, targetLaneId: string, targetIndex: number) => {
			await rpc.request.moveTicket({ ticketId, targetLaneId, targetIndex });
			await refreshBoard();
		},
		[refreshBoard],
	);

	const reorderTicketsInLane = useCallback(
		async (laneId: string, ticketIds: string[]) => {
			await rpc.request.reorderTicketsInLane({ laneId, ticketIds });
			await refreshBoard();
		},
		[refreshBoard],
	);

	return { createTicket, updateTicket, deleteTicket, moveTicket, reorderTicketsInLane };
}
