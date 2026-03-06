import type { BrowserWindow } from "electrobun/bun";
import type { DB } from "../db/connection";
import { getConnection, closeConnection } from "../db/connection";

interface WindowState {
	projectPath: string;
	db: DB;
	window: BrowserWindow;
}

const windows = new Map<number, WindowState>();

export function registerWindow(
	windowId: number,
	projectPath: string,
	window: BrowserWindow,
): void {
	const db = getConnection(projectPath);
	windows.set(windowId, { projectPath, db, window });
}

export function getWindowState(windowId: number): WindowState | undefined {
	return windows.get(windowId);
}

export function getProjectForWindow(windowId: number): { projectPath: string; db: DB } | undefined {
	const state = windows.get(windowId);
	if (!state) return undefined;
	return { projectPath: state.projectPath, db: state.db };
}

export function unregisterWindow(windowId: number): void {
	const state = windows.get(windowId);
	if (state) {
		closeConnection(state.projectPath);
		windows.delete(windowId);
	}
}

export function getWindowForProject(projectPath: string): BrowserWindow | undefined {
	for (const state of windows.values()) {
		if (state.projectPath === projectPath) return state.window;
	}
	return undefined;
}

export function getAllWindows(): Map<number, WindowState> {
	return windows;
}
