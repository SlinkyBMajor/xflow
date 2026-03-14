import type { RPCSchema } from "electrobun/bun";

// ── Data Types ──

export interface MergeResult {
	success: boolean;
	conflicted: boolean;
	conflictFiles?: string[];
	prUrl?: string;
	prNumber?: number;
	prMerged?: boolean;
	error?: string;
}

export interface BoardSettings {
	defaultWorktreeEnabled?: boolean;
	prPollingEnabled?: boolean;
}

export interface Board {
	id: string;
	name: string;
	createdAt: string;
	settings?: BoardSettings | null;
}

export interface Lane {
	id: string;
	boardId: string;
	name: string;
	order: number;
	color: string | null;
	wipLimit: number | null;
	allowTicketCreation: boolean;
	workflowId: string | null;
}

export interface TicketMetadata {
	runCount?: number;
	agentRunCount?: number;
	retryCount?: number;
	abortCount?: number;
	lastErrorMessage?: string;
	[key: string]: unknown;
}

export interface TicketDerivedData {
	lastCompletedNodeId: string | null;
	totalRunDurationMs: number;
	totalAgentDurationMs: number;
	lastAgentOutput: string | null;
	laneHistory: { laneId: string; laneName: string; enteredAt: string; exitedAt: string | null }[];
	laneElapsedMs: number;
}

export interface Ticket {
	id: string;
	boardId: string;
	laneId: string;
	title: string;
	body: string | null;
	tags: string[];
	metadata: TicketMetadata;
	laneEnteredAt: string | null;
	order: number;
	createdAt: string;
	updatedAt: string;
}

export interface BoardWithLanesAndTickets {
	board: Board;
	lanes: Lane[];
	tickets: Ticket[];
}

export interface RecentProject {
	path: string;
	name: string;
	lastOpened: string;
}

export interface ProjectInfo {
	path: string;
	name: string;
}

export type ProjectOpenResult = {
	project: ProjectInfo;
	board: BoardWithLanesAndTickets;
	interruptedRuns: InterruptedRunInfo[];
};

// ── Workflow Output Types ──

export type WorkflowOutputStatus = "success" | "error" | "timeout" | "partial";

/** In-memory result stored in WorkflowContext.nodeOutputs for each completed node. */
export interface NodeResult {
	status: WorkflowOutputStatus;
	output: unknown;
}

export interface WorkflowOutputEntry {
	output: string;
	runId: string;
	nodeId: string;
	nodeType?: IRNodeType;
	completedAt: string;
	status?: WorkflowOutputStatus;
	label?: string;
}

export interface EnrichedWorkflowRun {
	run: WorkflowRun;
	workflowName: string;
	runNumber: number;
}

export interface TicketComment {
	id: string;
	ticketId: string;
	body: string;
	refNodeId: string | null;
	refLabel: string | null;
	createdAt: string;
	updatedAt: string | null;
}

// ── Workflow IR Types ──

export type IRNodeType =
	| "start"
	| "end"
	| "claudeAgent"
	| "customScript"
	| "notify"
	| "waitForApproval"
	| "moveToLane"
	| "condition"
	| "setMetadata"
	| "log"
	| "gitAction";

export type ClaudeModel = "sonnet" | "opus" | "haiku";

export type AllowedToolsPreset = "plan-only" | "read-only" | "edit" | "full" | "custom";

export const ALLOWED_TOOLS_PRESETS: Record<Exclude<AllowedToolsPreset, "custom">, string[]> = {
	"plan-only": ["Read", "Grep", "Glob", "Bash(find:*)", "Bash(ls:*)"],
	"read-only": ["Read", "Grep", "Glob"],
	"edit": ["Read", "Write", "Edit", "Grep", "Glob"],
	"full": ["Read", "Write", "Edit", "Bash", "Grep", "Glob", "Agent"],
};

// Hard deny-list for restricted presets. --dangerously-skip-permissions overrides
// --allowedTools, so we use --disallowedTools as a secondary enforcement layer.
export const DISALLOWED_TOOLS_PRESETS: Partial<Record<AllowedToolsPreset, string[]>> = {
	"plan-only": ["Write", "Edit", "NotebookEdit", "Bash"],
	"read-only": ["Write", "Edit", "NotebookEdit", "Bash"],
	"edit": ["Bash", "NotebookEdit"],
};

export interface ClaudeAgentConfig {
	prompt: string;
	timeoutMs?: number;
	includeWorkflowOutput?: boolean;
	worktreeEnabled?: boolean;
	outputLabel?: string;
	model?: ClaudeModel;
	maxTurns?: number;
	systemPrompt?: string;
	skipPermissions?: boolean;
	allowedToolsPreset?: AllowedToolsPreset;
	allowedToolsCustom?: string;
}

export interface CustomScriptConfig {
	script: string;
	interpreter?: "bun" | "sh";
	timeoutMs?: number;
}

export interface NotifyConfig {
	title: string;
	body: string;
}

export interface WaitForApprovalConfig {
	message: string;
}

export interface MoveToLaneConfig {
	laneId: string;
	laneName: string;
}

export interface ConditionConfig {
	expression: string;
}

export interface SetMetadataConfig {
	key: string;
	value: string;
}

export interface LogConfig {
	message: string;
}

export type GitActionType = "createPr" | "addReviewer" | "mergePr";
export type MergeMethod = "squash" | "merge" | "rebase";

export interface GitActionConfig {
	action: GitActionType;
	baseBranch?: string;
	prTitle?: string;
	prBody?: string;
	reviewer?: string;
	prNumber?: string;
	mergeMethod?: MergeMethod;
}

export type IRNodeConfig =
	| { type: "start" }
	| { type: "end" }
	| { type: "claudeAgent" } & ClaudeAgentConfig
	| { type: "customScript" } & CustomScriptConfig
	| { type: "notify" } & NotifyConfig
	| { type: "waitForApproval" } & WaitForApprovalConfig
	| { type: "moveToLane" } & MoveToLaneConfig
	| { type: "condition" } & ConditionConfig
	| { type: "setMetadata" } & SetMetadataConfig
	| { type: "log" } & LogConfig
	| { type: "gitAction" } & GitActionConfig;

export interface IRNode {
	id: string;
	type: IRNodeType;
	position: { x: number; y: number };
	label?: string;
	config: IRNodeConfig;
}

export interface IREdge {
	id: string;
	from: string;
	to: string;
	on?: string;
}

export interface WorkflowIR {
	version: 1;
	nodes: IRNode[];
	edges: IREdge[];
}

export interface Workflow {
	id: string;
	name: string;
	definition: WorkflowIR;
	createdAt: string;
	updatedAt: string;
}

// ── Workflow Run Types ──

export interface WorkflowRun {
	id: string;
	ticketId: string;
	workflowId: string;
	actorSnapshot: unknown;
	currentNodeId: string | null;
	nodeStatus: string;
	status: string;
	startedAt: string;
	finishedAt: string | null;
	lastCheckpoint: string | null;
	worktreePath?: string | null;
	worktreeBranch?: string | null;
	mergeResult?: MergeResult | null;
}

export interface RunEvent {
	id: string;
	runId: string;
	type: string;
	payload: unknown;
	timestamp: string;
}

// ── Interrupted Run Types ──

export interface InterruptedRunInfo {
	run: WorkflowRun;
	ticketTitle: string;
	workflowName: string;
	interruptedNodeLabel: string | null;
	interruptedNodeType: IRNodeType | null;
	autoResumable: boolean;
}

// ── Workflow Version Types ──

export interface WorkflowVersion {
	id: string;
	workflowId: string;
	version: number;
	definition: WorkflowIR;
	createdAt: string;
	label: string | null;
}

// ── Board Template Types ──

export interface BoardTemplate {
	id: string;
	name: string;
	description?: string;
	version: 1;
	lanes: Array<{
		name: string;
		color: string | null;
		order: number;
		workflow?: WorkflowIR;
	}>;
	createdAt: string;
	builtIn?: boolean;
}

// ── Board Export Types ──

export interface BoardExport {
	version: 1;
	exportedAt: string;
	boardSettings?: BoardSettings;
	lanes: Array<{
		name: string;
		color: string | null;
		order: number;
		wipLimit: number | null;
		allowTicketCreation: boolean;
		workflow?: { name: string; definition: WorkflowIR };
	}>;
}

// ── Run Visualization Types ──

export type NodeRunStatus = "idle" | "active" | "completed" | "error";

export interface WorkflowRunState {
	runId: string;
	status: string;
	currentNodeId: string | null;
	completedNodeIds: string[];
	errorNodeId: string | null;
}

// ── Git / Worktree Types ──

export interface GitChangeSummary {
	added: number;
	modified: number;
	deleted: number;
	total: number;
}

export interface WorktreeRunInfo {
	run: WorkflowRun;
	changeSummary: GitChangeSummary;
}

// ── CLI Tool Check Types ──

export interface CliToolCheck {
	tool: string;
	installed: boolean;
	version: string | null;
	authenticated: boolean | null;
	authDetails: string | null;
	error: string | null;
}

// ── RPC Schema ──

export type XFlowRPC = {
	bun: RPCSchema<{
		requests: {
			openProject: {
				params: { path: string };
				response: ProjectOpenResult;
			};
			getRecentProjects: {
				params: {};
				response: RecentProject[];
			};
			removeRecentProject: {
				params: { path: string };
				response: void;
			};
			getBoard: {
				params: {};
				response: BoardWithLanesAndTickets;
			};
			updateBoard: {
				params: { name: string };
				response: Board;
			};
			createLane: {
				params: { name: string; color?: string };
				response: Lane;
			};
			updateLane: {
				params: { id: string; name?: string; color?: string; wipLimit?: number | null; allowTicketCreation?: boolean };
				response: Lane;
			};
			deleteLane: {
				params: { id: string };
				response: void;
			};
			reorderLanes: {
				params: { laneIds: string[] };
				response: void;
			};
			createTicket: {
				params: { laneId: string; title: string; body?: string; tags?: string[] };
				response: Ticket;
			};
			updateTicket: {
				params: { id: string; title?: string; body?: string; tags?: string[]; metadata?: TicketMetadata };
				response: Ticket;
			};
			deleteTicket: {
				params: { id: string };
				response: void;
			};
			resetTicket: {
				params: { id: string };
				response: Ticket;
			};
			moveTicket: {
				params: { ticketId: string; targetLaneId: string; targetIndex: number };
				response: void;
			};
			reorderTicketsInLane: {
				params: { laneId: string; ticketIds: string[] };
				response: void;
			};
			getWorkflow: {
				params: { id: string };
				response: Workflow | null;
			};
			listWorkflows: {
				params: {};
				response: Workflow[];
			};
			createWorkflow: {
				params: { name: string };
				response: Workflow;
			};
			updateWorkflow: {
				params: { id: string; name?: string; definition?: WorkflowIR };
				response: Workflow;
			};
			deleteWorkflow: {
				params: { id: string };
				response: void;
			};
			attachWorkflowToLane: {
				params: { laneId: string; workflowId: string | null };
				response: Lane;
			};
			getWorkflowRun: {
				params: { id: string };
				response: WorkflowRun | null;
			};
			getWorkflowRunsForTicket: {
				params: { ticketId: string };
				response: WorkflowRun[];
			};
			getEnrichedRunsForTicket: {
				params: { ticketId: string };
				response: EnrichedWorkflowRun[];
			};
			getRunEvents: {
				params: { runId: string };
				response: RunEvent[];
			};
			getInterruptedRuns: {
				params: {};
				response: InterruptedRunInfo[];
			};
			retryRun: {
				params: { runId: string };
				response: WorkflowRun;
			};
			listTemplates: {
				params: {};
				response: BoardTemplate[];
			};
			exportBoardAsTemplate: {
				params: { name: string; description?: string };
				response: BoardTemplate;
			};
			applyTemplate: {
				params: { templateId: string };
				response: void;
			};
			deleteTemplate: {
				params: { id: string };
				response: void;
			};
			listWorkflowVersions: {
				params: { workflowId: string };
				response: WorkflowVersion[];
			};
			restoreWorkflowVersion: {
				params: { workflowId: string; versionId: string };
				response: Workflow;
			};
			getActiveRunForWorkflow: {
				params: { workflowId: string };
				response: WorkflowRunState | null;
			};
			getTicketDerivedData: {
				params: { ticketId: string };
				response: TicketDerivedData;
			};
			abortInterruptedRun: {
				params: { runId: string };
				response: void;
			};
			getTicketComments: {
				params: { ticketId: string };
				response: TicketComment[];
			};
			addTicketComment: {
				params: { ticketId: string; body: string; refNodeId?: string; refLabel?: string };
				response: TicketComment;
			};
			updateTicketComment: {
				params: { id: string; body: string };
				response: TicketComment;
			};
			deleteTicketComment: {
				params: { id: string };
				response: void;
			};
			approveRun: {
				params: { runId: string; feedback?: string };
				response: void;
			};
			rejectRun: {
				params: { runId: string; feedback?: string };
				response: void;
			};
			mergeWorktreeBranch: {
				params: { runId: string; strategy?: "direct" | "pr" };
				response: void;
			};
			markPrMerged: {
				params: { runId: string };
				response: void;
			};
			getWorktreeDiff: {
				params: { runId: string };
				response: void;
			};
			cleanupWorktree: {
				params: { runId: string };
				response: void;
			};
			getWorktreeRuns: {
				params: {};
				response: WorktreeRunInfo[];
			};
			updateBoardSettings: {
				params: { settings: BoardSettings };
				response: Board;
			};
			checkCliTool: {
				params: { tool: string };
				response: CliToolCheck;
			};
			openInEditor: {
				params: { content: string; label: string };
				response: void;
			};
			resetDatabase: {
				params: {};
				response: ProjectOpenResult;
			};
			resetAllTickets: {
				params: {};
				response: void;
			};
			exportBoard: {
				params: {};
				response: { path: string };
			};
			importBoard: {
				params: { path: string };
				response: void;
			};
			generateWorkflowFromPrompt: {
				params: { prompt: string; existingIR?: WorkflowIR; mode: "replace" | "add" };
				response: void;
			};
		};
		messages: {
			openProjectPicker: {};
			openExternal: { url: string };
			openFilePicker: { accept?: string };
			toggleMaximize: {};
		};
	}>;
	webview: RPCSchema<{
		requests: {};
		messages: {
			boardUpdated: BoardWithLanesAndTickets;
			projectOpened: ProjectOpenResult;
			projectPickerResult: { path: string | null };
			workflowRunUpdated: WorkflowRun;
			interruptedRunsDetected: InterruptedRunInfo[];
			runEventAdded: RunEvent;
			worktreeMergeResult: { runId: string; result: MergeResult };
			worktreeDiffResult: { runId: string; diff: string };
			worktreeCleanupDone: { runId: string };
			filePickerResult: { path: string | null };
			ticketCommentAdded: TicketComment;
			ticketCommentUpdated: TicketComment;
			workflowGenerationResult: { ir: WorkflowIR | null; error: string | null; mode: "replace" | "add" };
			workflowGenerationEvent: { type: "text" | "tool_use" | "tool_result" | "status"; content: string };
		};
	}>;
};
