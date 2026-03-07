import { Electroview } from "electrobun/view";
import type { XFlowRPC, BoardWithLanesAndTickets, ProjectOpenResult, WorkflowRun } from "../shared/types";

type BoardUpdateListener = (data: BoardWithLanesAndTickets) => void;
type ProjectOpenedListener = (data: ProjectOpenResult) => void;
type PickerResultListener = (path: string | null) => void;
type WorkflowRunUpdateListener = (run: WorkflowRun) => void;

const boardListeners = new Set<BoardUpdateListener>();
const projectListeners = new Set<ProjectOpenedListener>();
const pickerListeners = new Set<PickerResultListener>();
const workflowRunListeners = new Set<WorkflowRunUpdateListener>();

const rpcDef = Electroview.defineRPC<XFlowRPC>({
	handlers: {
		requests: {},
		messages: {
			boardUpdated: (data) => {
				for (const listener of boardListeners) listener(data);
			},
			projectOpened: (data) => {
				for (const listener of projectListeners) listener(data);
			},
			projectPickerResult: ({ path }) => {
				for (const listener of pickerListeners) listener(path);
			},
			workflowRunUpdated: (data) => {
				for (const listener of workflowRunListeners) listener(data);
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

export function onWorkflowRunUpdated(listener: WorkflowRunUpdateListener): () => void {
	workflowRunListeners.add(listener);
	return () => workflowRunListeners.delete(listener);
}

export function requestProjectPicker(): Promise<string | null> {
	return new Promise((resolve) => {
		const onResult: PickerResultListener = (path) => {
			pickerListeners.delete(onResult);
			resolve(path);
		};
		pickerListeners.add(onResult);
		rpc.send.openProjectPicker({});
	});
}
