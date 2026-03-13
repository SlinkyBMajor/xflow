import { useCallback, useEffect } from "react";
import { rpc, onTicketCommentAdded, onTicketCommentUpdated } from "../rpc";
import type { TicketComment } from "../../shared/types";
import { useRpcListData } from "./useRpcListData";

const appendComment = (prev: TicketComment[], item: TicketComment) => [...prev, item];

export function useTicketComments(ticketId: string | null) {
	const fetchFn = useCallback((id: string) => rpc.request.getTicketComments({ ticketId: id }), []);
	const matchFn = useCallback((comment: TicketComment, id: string) => comment.ticketId === id, []);

	const { data: comments, refresh: refreshComments, setData: setComments } = useRpcListData(
		ticketId,
		fetchFn,
		onTicketCommentAdded,
		matchFn,
		appendComment,
	);

	useEffect(() => {
		if (!ticketId) return;
		return onTicketCommentUpdated((updated) => {
			if (updated.ticketId === ticketId) {
				setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
			}
		});
	}, [ticketId, setComments]);

	const addComment = useCallback(
		async (body: string, refNodeId?: string, refLabel?: string) => {
			if (!ticketId) return;
			await rpc.request.addTicketComment({ ticketId, body, refNodeId, refLabel });
		},
		[ticketId],
	);

	const editComment = useCallback(
		async (id: string, body: string) => {
			await rpc.request.updateTicketComment({ id, body });
		},
		[],
	);

	return { comments, addComment, editComment, refreshComments };
}
