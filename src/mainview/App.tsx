import { useState } from "react";
import { useProject } from "./hooks/useProject";
import { WelcomeScreen } from "./components/welcome/WelcomeScreen";
import { BoardView } from "./components/board/BoardView";
import { WorkflowEditor } from "./components/workflow/WorkflowEditor";
import { TooltipProvider } from "./components/ui/tooltip";

type AppView =
	| { type: "board" }
	| { type: "workflow-editor"; laneId: string; laneName: string; workflowId: string };

export default function App() {
	const {
		project,
		boardData,
		setBoardData,
		recentProjects,
		openProjectPicker,
		openProject,
		closeProject,
		removeRecentProject,
	} = useProject();

	const [view, setView] = useState<AppView>({ type: "board" });

	const handleEditWorkflow = (laneId: string, laneName: string, workflowId: string) => {
		setView({ type: "workflow-editor", laneId, laneName, workflowId });
	};

	if (!project || !boardData) {
		return (
			<TooltipProvider>
				<WelcomeScreen
					recentProjects={recentProjects}
					onOpenProject={openProjectPicker}
					onSelectRecent={openProject}
					onRemoveRecent={removeRecentProject}
				/>
			</TooltipProvider>
		);
	}

	if (view.type === "workflow-editor") {
		return (
			<TooltipProvider>
				<WorkflowEditor
					workflowId={view.workflowId}
					laneId={view.laneId}
					laneName={view.laneName}
					lanes={boardData.lanes}
					onBack={() => setView({ type: "board" })}
				/>
			</TooltipProvider>
		);
	}

	return (
		<TooltipProvider>
			<BoardView
				boardData={boardData}
				setBoardData={setBoardData}
				projectName={project.name}
				recentProjects={recentProjects}
				onSwitchProject={openProject}
				onOpenProjectPicker={openProjectPicker}
				onCloseProject={closeProject}
				onEditWorkflow={handleEditWorkflow}
			/>
		</TooltipProvider>
	);
}
