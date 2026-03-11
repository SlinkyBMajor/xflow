import { Electroview } from "electrobun/view";
import type { XFlowRPC, BoardWithLanesAndTickets, ProjectOpenResult, WorkflowRun, InterruptedRunInfo, RunEvent, MergeResult, TicketComment, WorkflowIR } from "../shared/types";

type BoardUpdateListener = (data: BoardWithLanesAndTickets) => void;
type ProjectOpenedListener = (data: ProjectOpenResult) => void;
type PickerResultListener = (path: string | null) => void;
type WorkflowRunUpdateListener = (run: WorkflowRun) => void;
type InterruptedRunsListener = (runs: InterruptedRunInfo[]) => void;
type RunEventListener = (event: RunEvent) => void;
type WorktreeMergeResultListener = (data: { runId: string; result: MergeResult }) => void;
type WorktreeDiffResultListener = (data: { runId: string; diff: string }) => void;
type WorktreeCleanupDoneListener = (data: { runId: string }) => void;
type TicketCommentListener = (comment: TicketComment) => void;
type WorkflowGenerationResultListener = (data: { ir: WorkflowIR | null; error: string | null; mode: "replace" | "add" }) => void;
type WorkflowGenerationEventListener = (data: { type: "text" | "tool_use" | "tool_result" | "status"; content: string }) => void;

const boardListeners = new Set<BoardUpdateListener>();
const projectListeners = new Set<ProjectOpenedListener>();
const pickerListeners = new Set<PickerResultListener>();
const workflowRunListeners = new Set<WorkflowRunUpdateListener>();
const interruptedRunsListeners = new Set<InterruptedRunsListener>();
const runEventListeners = new Set<RunEventListener>();
const worktreeMergeResultListeners = new Set<WorktreeMergeResultListener>();
const worktreeDiffResultListeners = new Set<WorktreeDiffResultListener>();
const worktreeCleanupDoneListeners = new Set<WorktreeCleanupDoneListener>();
const ticketCommentListeners = new Set<TicketCommentListener>();
const workflowGenerationResultListeners = new Set<WorkflowGenerationResultListener>();
const workflowGenerationEventListeners = new Set<WorkflowGenerationEventListener>();

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
			interruptedRunsDetected: (data) => {
				for (const listener of interruptedRunsListeners) listener(data);
			},
			runEventAdded: (data) => {
				for (const listener of runEventListeners) listener(data);
			},
			worktreeMergeResult: (data) => {
				for (const listener of worktreeMergeResultListeners) listener(data);
			},
			worktreeDiffResult: (data) => {
				for (const listener of worktreeDiffResultListeners) listener(data);
			},
			worktreeCleanupDone: (data) => {
				for (const listener of worktreeCleanupDoneListeners) listener(data);
			},
			ticketCommentAdded: (data) => {
				for (const listener of ticketCommentListeners) listener(data);
			},
			workflowGenerationResult: (data) => {
				for (const listener of workflowGenerationResultListeners) listener(data);
			},
			workflowGenerationEvent: (data) => {
				for (const listener of workflowGenerationEventListeners) listener(data);
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

export function onInterruptedRunsDetected(listener: InterruptedRunsListener): () => void {
	interruptedRunsListeners.add(listener);
	return () => interruptedRunsListeners.delete(listener);
}

export function onRunEventAdded(listener: RunEventListener): () => void {
	runEventListeners.add(listener);
	return () => runEventListeners.delete(listener);
}

export function onWorktreeMergeResult(listener: WorktreeMergeResultListener): () => void {
	worktreeMergeResultListeners.add(listener);
	return () => worktreeMergeResultListeners.delete(listener);
}

export function onWorktreeDiffResult(listener: WorktreeDiffResultListener): () => void {
	worktreeDiffResultListeners.add(listener);
	return () => worktreeDiffResultListeners.delete(listener);
}

export function onWorktreeCleanupDone(listener: WorktreeCleanupDoneListener): () => void {
	worktreeCleanupDoneListeners.add(listener);
	return () => worktreeCleanupDoneListeners.delete(listener);
}

export function onTicketCommentAdded(listener: TicketCommentListener): () => void {
	ticketCommentListeners.add(listener);
	return () => ticketCommentListeners.delete(listener);
}

export function onWorkflowGenerationResult(listener: WorkflowGenerationResultListener): () => void {
	workflowGenerationResultListeners.add(listener);
	return () => workflowGenerationResultListeners.delete(listener);
}

export function onWorkflowGenerationEvent(listener: WorkflowGenerationEventListener): () => void {
	workflowGenerationEventListeners.add(listener);
	return () => workflowGenerationEventListeners.delete(listener);
}

export function openExternal(url: string) {
	rpc.send.openExternal({ url });
}

export function toggleMaximize() {
	rpc.send.toggleMaximize({});
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
