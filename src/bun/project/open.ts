import { existsSync, mkdirSync } from "fs";
import { basename } from "path";
import { getConnection, enableForeignKeys } from "../db/connection";
import { runMigrations } from "../db/migrate";
import { createBoard, getFirstBoard } from "../db/queries/boards";
import { createLane, getLanesByBoard } from "../db/queries/lanes";
import { getTicketsByBoard } from "../db/queries/tickets";
import { addRecent } from "./recents";
import { detectInterruptedRuns } from "../engine/recovery";
import { resumeRun } from "../engine/runner";
import type { ProjectOpenResult, BoardWithLanesAndTickets, WorkflowRun, RunEvent } from "../../shared/types";

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

export function openProject(
	projectPath: string,
	notifyFrontend?: (run: WorkflowRun) => void,
	notifyEvent?: (event: RunEvent) => void,
): ProjectOpenResult {
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

	const interrupted = detectInterruptedRuns(db);

	// Auto-resume waitForApproval nodes immediately
	const nonResumable = interrupted.filter((info) => {
		if (info.autoResumable && notifyFrontend) {
			try {
				resumeRun(db, info.run.id, notifyFrontend, projectPath, notifyEvent);
			} catch (err) {
				console.error(`[Recovery] Failed to auto-resume run ${info.run.id}:`, err);
				return true;
			}
			return false;
		}
		return true;
	});

	return {
		project: { path: projectPath, name: projectName },
		board: { board, lanes, tickets },
		interruptedRuns: nonResumable,
	};
}

export function getBoardData(projectPath: string): BoardWithLanesAndTickets {
	const db = getConnection(projectPath);
	const board = getFirstBoard(db)!;
	const lanes = getLanesByBoard(db, board.id);
	const tickets = getTicketsByBoard(db, board.id);
	return { board, lanes, tickets };
}
