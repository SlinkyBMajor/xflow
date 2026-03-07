import type { RPCSchema } from "electrobun/bun";

// ── Data Types ──

export interface Board {
	id: string;
	name: string;
	createdAt: string;
}

export interface Lane {
	id: string;
	boardId: string;
	name: string;
	order: number;
	color: string | null;
	wipLimit: number | null;
	workflowId: string | null;
}

export interface Ticket {
	id: string;
	boardId: string;
	laneId: string;
	title: string;
	body: string | null;
	tags: string[];
	metadata: Record<string, unknown>;
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
};

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
	| "log";

export interface ClaudeAgentConfig {
	prompt: string;
	timeoutMs?: number;
}

export interface CustomScriptConfig {
	script: string;
	interpreter?: "bun" | "sh";
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
	| { type: "log" } & LogConfig;

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
}

export interface RunEvent {
	id: string;
	runId: string;
	type: string;
	payload: unknown;
	timestamp: string;
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
				params: { id: string; name?: string; color?: string; wipLimit?: number | null };
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
				params: { id: string; title?: string; body?: string; tags?: string[]; metadata?: Record<string, unknown> };
				response: Ticket;
			};
			deleteTicket: {
				params: { id: string };
				response: void;
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
			getRunEvents: {
				params: { runId: string };
				response: RunEvent[];
			};
		};
		messages: {
			openProjectPicker: {};
		};
	}>;
	webview: RPCSchema<{
		requests: {};
		messages: {
			boardUpdated: BoardWithLanesAndTickets;
			projectOpened: ProjectOpenResult;
			projectPickerResult: { path: string | null };
			workflowRunUpdated: WorkflowRun;
		};
	}>;
};
