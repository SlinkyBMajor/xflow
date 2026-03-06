// Single-window model: tracks the currently active project.
// Projects are switched in-place rather than opening new windows.

let currentProjectPath: string | null = null;

export function setCurrentProject(path: string): void {
	currentProjectPath = path;
}

export function getCurrentProject(): string | null {
	return currentProjectPath;
}

export function clearCurrentProject(): void {
	currentProjectPath = null;
}
