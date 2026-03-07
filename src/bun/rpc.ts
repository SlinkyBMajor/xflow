import { BrowserView, Utils } from "electrobun/bun";
import type { XFlowRPC } from "../shared/types";
import { openProject, getBoardData } from "./project/open";
import { getRecents, removeRecent } from "./project/recents";
import { getConnection } from "./db/connection";
import * as boardQueries from "./db/queries/boards";
import * as laneQueries from "./db/queries/lanes";
import * as ticketQueries from "./db/queries/tickets";
import * as workflowQueries from "./db/queries/workflows";
import * as runQueries from "./db/queries/runs";
import { triggerWorkflowIfAttached } from "./engine/trigger";

// Track which project path is associated with the current RPC context
// Since Electrobun's defineRPC is global, views send their project path
let activeProjectPath: string | null = null;

// Reference to the BrowserWindow for sending messages back to the browser.
// Set via setMainWindow() after the BrowserWindow is created.
let mainWindow: any = null;

export function setMainWindow(win: any) {
	mainWindow = win;
}

function getDb() {
	if (!activeProjectPath) throw new Error("No project open");
	return getConnection(activeProjectPath);
}

function getBoard() {
	return getBoardData(activeProjectPath!);
}

export const rpc = BrowserView.defineRPC<XFlowRPC>({
	handlers: {
		requests: {
			openProject: ({ path }) => {
				console.log("[RPC] openProject called with path:", path);
				try {
					const result = openProject(path);
					activeProjectPath = path;
					console.log("[RPC] openProject success:", result.project);
					return result;
				} catch (err) {
					console.error("[RPC] openProject error:", err);
					throw err;
				}
			},

			getRecentProjects: () => {
				return getRecents();
			},

			removeRecentProject: ({ path }) => {
				removeRecent(path);
			},

			getBoard: () => {
				return getBoard();
			},

			updateBoard: ({ name }) => {
				const db = getDb();
				const board = boardQueries.getFirstBoard(db)!;
				return boardQueries.updateBoard(db, board.id, name);
			},

			createLane: ({ name, color }) => {
				const db = getDb();
				const board = boardQueries.getFirstBoard(db)!;
				const id = crypto.randomUUID();
				return laneQueries.createLane(db, id, board.id, name, color ?? null);
			},

			updateLane: ({ id, name, color, wipLimit }) => {
				const db = getDb();
				return laneQueries.updateLane(db, id, { name, color, wipLimit });
			},

			deleteLane: ({ id }) => {
				const db = getDb();
				laneQueries.deleteLane(db, id);
			},

			reorderLanes: ({ laneIds }) => {
				const db = getDb();
				laneQueries.reorderLanes(db, laneIds);
			},

			createTicket: ({ laneId, title, body, tags }) => {
				const db = getDb();
				const board = boardQueries.getFirstBoard(db)!;
				const id = crypto.randomUUID();
				return ticketQueries.createTicket(
					db,
					id,
					board.id,
					laneId,
					title,
					body ?? null,
					tags ?? [],
				);
			},

			updateTicket: ({ id, title, body, tags, metadata }) => {
				const db = getDb();
				return ticketQueries.updateTicket(db, id, { title, body, tags, metadata });
			},

			deleteTicket: ({ id }) => {
				const db = getDb();
				ticketQueries.deleteTicket(db, id);
			},

			moveTicket: ({ ticketId, targetLaneId, targetIndex }) => {
				const db = getDb();
				ticketQueries.moveTicket(db, ticketId, targetLaneId, targetIndex);
				triggerWorkflowIfAttached(db, ticketId, targetLaneId, (run) => {
					mainWindow?.webview.rpc.send.workflowRunUpdated(run);
				});
			},

			reorderTicketsInLane: ({ laneId, ticketIds }) => {
				const db = getDb();
				ticketQueries.reorderTicketsInLane(db, laneId, ticketIds);
			},
			getWorkflow: ({ id }) => {
				const db = getDb();
				return workflowQueries.getWorkflowById(db, id);
			},

			createWorkflow: ({ name }) => {
				const db = getDb();
				const id = crypto.randomUUID();
				const defaultIR = {
					version: 1 as const,
					nodes: [
						{ id: crypto.randomUUID(), type: "start" as const, position: { x: 250, y: 50 }, config: { type: "start" as const } },
						{ id: crypto.randomUUID(), type: "end" as const, position: { x: 250, y: 300 }, config: { type: "end" as const } },
					],
					edges: [],
				};
				return workflowQueries.createWorkflow(db, id, name, defaultIR);
			},

			updateWorkflow: ({ id, name, definition }) => {
				const db = getDb();
				return workflowQueries.updateWorkflow(db, id, { name, definition });
			},

			deleteWorkflow: ({ id }) => {
				const db = getDb();
				workflowQueries.deleteWorkflow(db, id);
			},

			attachWorkflowToLane: ({ laneId, workflowId }) => {
				const db = getDb();
				return laneQueries.attachWorkflow(db, laneId, workflowId);
			},

			getWorkflowRun: ({ id }) => {
				const db = getDb();
				return runQueries.getRunById(db, id);
			},

			getWorkflowRunsForTicket: ({ ticketId }) => {
				const db = getDb();
				return runQueries.getRunsByTicket(db, ticketId);
			},

			getRunEvents: ({ runId }) => {
				const db = getDb();
				return runQueries.getEventsByRun(db, runId);
			},
		},
		messages: {
			openProjectPicker: async () => {
				console.log("[RPC] openProjectPicker message received");
				try {
					const paths = await Utils.openFileDialog({
						canChooseFiles: false,
						canChooseDirectory: true,
						allowsMultipleSelection: false,
					});
					console.log("[RPC] openFileDialog returned:", paths);
					const path = paths && paths.length > 0 ? paths[0] : null;
					mainWindow?.webview.rpc.send.projectPickerResult({ path });
				} catch (err) {
					console.error("[RPC] openProjectPicker error:", err);
					mainWindow?.webview.rpc.send.projectPickerResult({ path: null });
				}
			},
		},
	},
});
