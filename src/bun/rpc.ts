import { BrowserView, Utils } from "electrobun/bun";
import type { XFlowRPC } from "../shared/types";
import { openProject, getBoardData } from "./project/open";
import { getRecents, removeRecent } from "./project/recents";
import { getProjectForWindow, registerWindow } from "./project/window-manager";
import { getConnection } from "./db/connection";
import * as boardQueries from "./db/queries/boards";
import * as laneQueries from "./db/queries/lanes";
import * as ticketQueries from "./db/queries/tickets";

// Track which project path is associated with the current RPC context
// Since Electrobun's defineRPC is global, views send their project path
let activeProjectPath: string | null = null;

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
			openProjectPicker: async () => {
				const paths = await Utils.openFileDialog({
					canChooseFiles: false,
					canChooseDirectory: true,
					allowsMultipleSelection: false,
				});
				if (paths && paths.length > 0) return paths[0];
				return null;
			},

			openProject: ({ path }) => {
				const result = openProject(path);
				activeProjectPath = path;
				return result;
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
			},

			reorderTicketsInLane: ({ laneId, ticketIds }) => {
				const db = getDb();
				ticketQueries.reorderTicketsInLane(db, laneId, ticketIds);
			},
		},
		messages: {},
	},
});
