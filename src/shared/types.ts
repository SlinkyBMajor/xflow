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

// ── RPC Schema ──

export type XFlowRPC = {
	bun: RPCSchema<{
		requests: {
			openProjectPicker: {
				params: {};
				response: string | null;
			};
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
		};
		messages: {};
	}>;
	webview: RPCSchema<{
		requests: {};
		messages: {
			boardUpdated: BoardWithLanesAndTickets;
			projectOpened: ProjectOpenResult;
		};
	}>;
};
