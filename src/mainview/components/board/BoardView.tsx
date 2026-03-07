import type { BoardWithLanesAndTickets, RecentProject } from "../../../shared/types";
import { useBoard } from "../../hooks/useBoard";
import { useLanes } from "../../hooks/useLanes";
import { useTickets } from "../../hooks/useTickets";
import { BoardHeader } from "./BoardHeader";
import { KanbanBoard } from "./KanbanBoard";

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

	return (
		<div className="h-screen flex flex-col bg-zinc-950">
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
			/>
			<KanbanBoard
				boardData={boardData}
				lanes={lanes}
				tickets={tickets}
				refreshBoard={refreshBoard}
				onEditWorkflow={onEditWorkflow}
				onCreateWorkflowForLane={onCreateWorkflowForLane}
			/>
		</div>
	);
}
