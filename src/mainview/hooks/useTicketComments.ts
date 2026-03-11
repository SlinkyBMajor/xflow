import { useCallback } from "react";
import { rpc, onTicketCommentAdded } from "../rpc";
import type { TicketComment } from "../../shared/types";
import { useRpcListData } from "./useRpcListData";

const appendComment = (prev: TicketComment[], item: TicketComment) => [...prev, item];

export function useTicketComments(ticketId: string | null) {
	const fetchFn = useCallback((id: string) => rpc.request.getTicketComments({ ticketId: id }), []);
	const matchFn = useCallback((comment: TicketComment, id: string) => comment.ticketId === id, []);

	const { data: comments, refresh: refreshComments } = useRpcListData(
		ticketId,
		fetchFn,
		onTicketCommentAdded,
		matchFn,
		appendComment,
	);

	const addComment = useCallback(
		async (body: string, refNodeId?: string, refLabel?: string) => {
			if (!ticketId) return;
			await rpc.request.addTicketComment({ ticketId, body, refNodeId, refLabel });
		},
		[ticketId],
	);

	return { comments, addComment, refreshComments };
}
