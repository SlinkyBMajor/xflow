import { useState, useEffect, useCallback } from "react";
import { rpc, onTicketCommentAdded } from "../rpc";
import type { TicketComment } from "../../shared/types";

export function useTicketComments(ticketId: string | null) {
	const [comments, setComments] = useState<TicketComment[]>([]);

	const fetchComments = useCallback(async () => {
		if (!ticketId) {
			setComments([]);
			return;
		}
		const data = await rpc.request.getTicketComments({ ticketId });
		setComments(data);
	}, [ticketId]);

	useEffect(() => {
		fetchComments();
	}, [fetchComments]);

	useEffect(() => {
		if (!ticketId) return;
		return onTicketCommentAdded((comment) => {
			if (comment.ticketId === ticketId) {
				setComments((prev) => [...prev, comment]);
			}
		});
	}, [ticketId]);

	const addComment = useCallback(
		async (body: string, refNodeId?: string, refLabel?: string) => {
			if (!ticketId) return;
			await rpc.request.addTicketComment({ ticketId, body, refNodeId, refLabel });
		},
		[ticketId],
	);

	return { comments, addComment, refreshComments: fetchComments };
}
