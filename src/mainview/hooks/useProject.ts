import { useState, useCallback, useEffect } from "react";
import { rpc, onProjectOpened } from "../rpc";
import type { ProjectInfo, BoardWithLanesAndTickets, RecentProject } from "../../shared/types";

export function useProject() {
	const [project, setProject] = useState<ProjectInfo | null>(null);
	const [boardData, setBoardData] = useState<BoardWithLanesAndTickets | null>(null);
	const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

	useEffect(() => {
		rpc.request.getRecentProjects({}).then(setRecentProjects).catch(console.error);
		return onProjectOpened((data) => {
			setProject(data.project);
			setBoardData(data.board);
		});
	}, []);

	const openProjectPicker = useCallback(async () => {
		console.log("[useProject] openProjectPicker called");
		try {
			const path = await rpc.request.openProjectPicker({});
			console.log("[useProject] picker returned path:", path);
			if (path) {
				const result = await rpc.request.openProject({ path });
				console.log("[useProject] openProject result:", result);
				setProject(result.project);
				setBoardData(result.board);
				rpc.request.getRecentProjects({}).then(setRecentProjects).catch(console.error);
			}
		} catch (err) {
			console.error("[useProject] openProjectPicker error:", err);
		}
	}, []);

	const openProject = useCallback(async (path: string) => {
		const result = await rpc.request.openProject({ path });
		setProject(result.project);
		setBoardData(result.board);
	}, []);

	const removeRecentProject = useCallback(async (path: string) => {
		await rpc.request.removeRecentProject({ path });
		setRecentProjects((prev) => prev.filter((r) => r.path !== path));
	}, []);

	const closeProject = useCallback(() => {
		setProject(null);
		setBoardData(null);
		rpc.request.getRecentProjects({}).then(setRecentProjects).catch(console.error);
	}, []);

	return {
		project,
		boardData,
		setBoardData,
		recentProjects,
		openProjectPicker,
		openProject,
		closeProject,
		removeRecentProject,
	};
}
