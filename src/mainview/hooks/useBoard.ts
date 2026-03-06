import { useEffect, useCallback } from "react";
import { rpc, onBoardUpdated } from "../rpc";
import type { BoardWithLanesAndTickets } from "../../shared/types";

export function useBoard(
	boardData: BoardWithLanesAndTickets | null,
	setBoardData: (data: BoardWithLanesAndTickets) => void,
) {
	useEffect(() => {
		return onBoardUpdated(setBoardData);
	}, [setBoardData]);

	const refreshBoard = useCallback(async () => {
		const data = await rpc.request.getBoard({});
		setBoardData(data);
	}, [setBoardData]);

	const updateBoardName = useCallback(
		async (name: string) => {
			await rpc.request.updateBoard({ name });
			await refreshBoard();
		},
		[refreshBoard],
	);

	return { boardData, refreshBoard, updateBoardName };
}
