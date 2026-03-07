import { existsSync, mkdirSync } from "fs";
import { basename } from "path";
import { getConnection, enableForeignKeys } from "../db/connection";
import { runMigrations } from "../db/migrate";
import { createBoard, getFirstBoard } from "../db/queries/boards";
import { createLane, getLanesByBoard } from "../db/queries/lanes";
import { getTicketsByBoard } from "../db/queries/tickets";
import { addRecent } from "./recents";
import type { ProjectOpenResult, BoardWithLanesAndTickets } from "../../shared/types";

function scaffoldXFlowDir(projectPath: string): void {
	const xflowDir = `${projectPath}/.xflow`;
	mkdirSync(xflowDir, { recursive: true });
	mkdirSync(`${xflowDir}/workflows`, { recursive: true });
	mkdirSync(`${xflowDir}/tickets`, { recursive: true });
	mkdirSync(`${xflowDir}/runs`, { recursive: true });
}

function createDefaultBoard(projectPath: string): void {
	const db = getConnection(projectPath);
	const boardId = crypto.randomUUID();
	const name = basename(projectPath);
	createBoard(db, boardId, name);

	const defaultLanes = [
		{ name: "To Do", color: "#6366f1" },
		{ name: "In Progress", color: "#f59e0b" },
		{ name: "Done", color: "#22c55e" },
	];

	for (const lane of defaultLanes) {
		createLane(db, crypto.randomUUID(), boardId, lane.name, lane.color);
	}
}

export function openProject(projectPath: string): ProjectOpenResult {
	const xflowDir = `${projectPath}/.xflow`;
	const isNew = !existsSync(xflowDir);

	if (isNew) {
		scaffoldXFlowDir(projectPath);
	}

	const db = getConnection(projectPath);
	runMigrations(db);
	enableForeignKeys(projectPath);

	if (isNew || !getFirstBoard(db)) {
		createDefaultBoard(projectPath);
	}

	const board = getFirstBoard(db)!;
	const lanes = getLanesByBoard(db, board.id);
	const tickets = getTicketsByBoard(db, board.id);

	const projectName = basename(projectPath);
	addRecent(projectPath, projectName);

	return {
		project: { path: projectPath, name: projectName },
		board: { board, lanes, tickets },
	};
}

export function getBoardData(projectPath: string): BoardWithLanesAndTickets {
	const db = getConnection(projectPath);
	const board = getFirstBoard(db)!;
	const lanes = getLanesByBoard(db, board.id);
	const tickets = getTicketsByBoard(db, board.id);
	return { board, lanes, tickets };
}
