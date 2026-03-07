import { Electroview } from "electrobun/view";
import type { XFlowRPC, BoardWithLanesAndTickets, ProjectOpenResult } from "../shared/types";

type BoardUpdateListener = (data: BoardWithLanesAndTickets) => void;
type ProjectOpenedListener = (data: ProjectOpenResult) => void;

const boardListeners = new Set<BoardUpdateListener>();
const projectListeners = new Set<ProjectOpenedListener>();

const rpcDef = Electroview.defineRPC<XFlowRPC>({
	maxRequestTime: 60000,
	handlers: {
		requests: {},
		messages: {
			boardUpdated: (data) => {
				for (const listener of boardListeners) listener(data);
			},
			projectOpened: (data) => {
				for (const listener of projectListeners) listener(data);
			},
		},
	},
});

const electroview = new Electroview({ rpc: rpcDef });

export const rpc = electroview.rpc!;

export function onBoardUpdated(listener: BoardUpdateListener): () => void {
	boardListeners.add(listener);
	return () => boardListeners.delete(listener);
}

export function onProjectOpened(listener: ProjectOpenedListener): () => void {
	projectListeners.add(listener);
	return () => projectListeners.delete(listener);
}
