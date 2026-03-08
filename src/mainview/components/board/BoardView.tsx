import { useState, useEffect } from "react";
import type { BoardWithLanesAndTickets, BoardSettings, RecentProject } from "../../../shared/types";
import { useBoard } from "../../hooks/useBoard";
import { useLanes } from "../../hooks/useLanes";
import { useTickets } from "../../hooks/useTickets";
import { useInterruptedRuns } from "../../hooks/useInterruptedRuns";
import { useActiveRuns } from "../../hooks/useActiveRuns";
import { BoardHeader } from "./BoardHeader";
import { BoardSettingsModal } from "./BoardSettingsModal";
import { InterruptedRunsBanner } from "./InterruptedRunsBanner";
import { KanbanBoard } from "./KanbanBoard";
import { TemplateManager } from "../templates/TemplateManager";
import { AgentPanel } from "./AgentPanel";
import { rpc } from "../../rpc";

interface BoardViewProps {
	boardData: BoardWithLanesAndTickets;
	setBoardData: (data: BoardWithLanesAndTickets) => void;
	projectName: string;
	recentProjects: RecentProject[];
	onSwitchProject: (path: string) => void;
	onOpenProjectPicker: () => void;
	onCloseProject: () => void;
	onEditWorkflow: (laneId: string, laneName: string, workflowId: string) => void;
	activeTab: "board" | "workflows";
	onSetTab: (tab: "board" | "workflows") => void;
	onCreateWorkflowForLane: (laneId: string, laneName: string) => Promise<void>;
}

export function BoardView({
	boardData,
	setBoardData,
	projectName,
	recentProjects,
	onSwitchProject,
	onOpenProjectPicker,
	onCloseProject,
	onEditWorkflow,
	activeTab,
	onSetTab,
	onCreateWorkflowForLane,
}: BoardViewProps) {
	const { refreshBoard, updateBoardName } = useBoard(boardData, setBoardData);
	const lanes = useLanes(refreshBoard);
	const tickets = useTickets(refreshBoard);
	const { interruptedRuns, retryRun, abortRun } = useInterruptedRuns();
	const activeRuns = useActiveRuns();
	const [showTemplates, setShowTemplates] = useState(false);
	const [showSettings, setShowSettings] = useState(false);

	const handleSaveSettings = async (settings: BoardSettings) => {
		await rpc.request.updateBoardSettings({ settings });
		refreshBoard();
	};

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "t") {
				e.preventDefault();
				setShowTemplates((prev) => !prev);
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, []);

	return (
		<div className="h-screen flex flex-col bg-[#0d1117]">
			<BoardHeader
				board={boardData.board}
				projectName={projectName}
				recentProjects={recentProjects}
				activeTab={activeTab}
				onUpdateName={updateBoardName}
				onSwitchProject={onSwitchProject}
				onOpenProjectPicker={onOpenProjectPicker}
				onCloseProject={onCloseProject}
				onSetTab={onSetTab}
				onOpenSettings={() => setShowSettings(true)}
			/>
			<BoardSettingsModal
				open={showSettings}
				onOpenChange={setShowSettings}
				settings={boardData.board.settings}
				onSave={handleSaveSettings}
			/>
			<InterruptedRunsBanner
				interruptedRuns={interruptedRuns}
				onRetry={retryRun}
				onAbort={abortRun}
			/>
			<div className="relative flex-1 min-h-0 flex flex-col">
				<KanbanBoard
					boardData={boardData}
					lanes={lanes}
					tickets={tickets}
					refreshBoard={refreshBoard}
					onEditWorkflow={onEditWorkflow}
					onCreateWorkflowForLane={onCreateWorkflowForLane}
					activeRuns={activeRuns}
				/>
				<AgentPanel
					activeRuns={activeRuns}
					tickets={boardData.tickets}
				/>
			</div>
			{showTemplates && (
				<TemplateManager
					onApply={() => {
						setShowTemplates(false);
						refreshBoard();
					}}
					onClose={() => setShowTemplates(false)}
				/>
			)}
		</div>
	);
}
