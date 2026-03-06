import { Utils } from "electrobun/bun";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import type { RecentProject } from "../../shared/types";

const MAX_RECENTS = 20;

function getRecentsPath(): string {
	const configDir = `${Utils.paths.config}/xflow`;
	if (!existsSync(configDir)) {
		mkdirSync(configDir, { recursive: true });
	}
	return `${configDir}/recents.json`;
}

function readRecentsFile(): RecentProject[] {
	const path = getRecentsPath();
	if (!existsSync(path)) return [];
	try {
		return JSON.parse(readFileSync(path, "utf-8"));
	} catch {
		return [];
	}
}

function writeRecentsFile(recents: RecentProject[]): void {
	writeFileSync(getRecentsPath(), JSON.stringify(recents, null, 2));
}

export function getRecents(): RecentProject[] {
	return readRecentsFile();
}

export function addRecent(path: string, name: string): void {
	const recents = readRecentsFile().filter((r) => r.path !== path);
	recents.unshift({
		path,
		name,
		lastOpened: new Date().toISOString(),
	});
	writeRecentsFile(recents.slice(0, MAX_RECENTS));
}

export function removeRecent(path: string): void {
	const recents = readRecentsFile().filter((r) => r.path !== path);
	writeRecentsFile(recents);
}
