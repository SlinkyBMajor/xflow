import { Electroview } from "electrobun/view";
import type { XFlowRPC, BoardWithLanesAndTickets, ProjectOpenResult, WorkflowRun, InterruptedRunInfo, RunEvent, MergeResult, TicketComment } from "../shared/types";
import { createListenerSet } from "./lib/event-emitter";

type PickerResultListener = (path: string | null) => void;

const board = createListenerSet<(data: BoardWithLanesAndTickets) => void>();
const project = createListenerSet<(data: ProjectOpenResult) => void>();
const picker = createListenerSet<PickerResultListener>();
const workflowRun = createListenerSet<(run: WorkflowRun) => void>();
const interruptedRuns = createListenerSet<(runs: InterruptedRunInfo[]) => void>();
const runEvent = createListenerSet<(event: RunEvent) => void>();
const worktreeMergeResult = createListenerSet<(data: { runId: string; result: MergeResult }) => void>();
const worktreeDiffResult = createListenerSet<(data: { runId: string; diff: string }) => void>();
const worktreeCleanupDone = createListenerSet<(data: { runId: string }) => void>();
const ticketComment = createListenerSet<(comment: TicketComment) => void>();

const rpcDef = Electroview.defineRPC<XFlowRPC>({
	handlers: {
		requests: {},
		messages: {
			boardUpdated: (data) => board.emit(data),
			projectOpened: (data) => project.emit(data),
			projectPickerResult: ({ path }) => picker.emit(path),
			workflowRunUpdated: (data) => workflowRun.emit(data),
			interruptedRunsDetected: (data) => interruptedRuns.emit(data),
			runEventAdded: (data) => runEvent.emit(data),
			worktreeMergeResult: (data) => worktreeMergeResult.emit(data),
			worktreeDiffResult: (data) => worktreeDiffResult.emit(data),
			worktreeCleanupDone: (data) => worktreeCleanupDone.emit(data),
			ticketCommentAdded: (data) => ticketComment.emit(data),
		},
	},
});

const electroview = new Electroview({ rpc: rpcDef });

export const rpc = electroview.rpc!;

export const onBoardUpdated = board.subscribe;
export const onProjectOpened = project.subscribe;
export const onWorkflowRunUpdated = workflowRun.subscribe;
export const onInterruptedRunsDetected = interruptedRuns.subscribe;
export const onRunEventAdded = runEvent.subscribe;
export const onWorktreeMergeResult = worktreeMergeResult.subscribe;
export const onWorktreeDiffResult = worktreeDiffResult.subscribe;
export const onWorktreeCleanupDone = worktreeCleanupDone.subscribe;
export const onTicketCommentAdded = ticketComment.subscribe;

export function openExternal(url: string) {
	rpc.send.openExternal({ url });
}

export function toggleMaximize() {
	rpc.send.toggleMaximize({});
}

export function requestProjectPicker(): Promise<string | null> {
	return new Promise((resolve) => {
		const onResult: PickerResultListener = (path) => {
			picker.listeners.delete(onResult);
			resolve(path);
		};
		picker.listeners.add(onResult);
		rpc.send.openProjectPicker({});
	});
}
