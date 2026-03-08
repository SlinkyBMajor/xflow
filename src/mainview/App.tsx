import { useState, useCallback, useEffect } from "react";
import { useProject } from "./hooks/useProject";
import { useWorkflow } from "./hooks/useWorkflow";
import { WelcomeScreen } from "./components/welcome/WelcomeScreen";
import { BoardView } from "./components/board/BoardView";
import { BoardHeader } from "./components/board/BoardHeader";
import { WorkflowListView } from "./components/workflow/WorkflowListView";
import { TooltipProvider } from "./components/ui/tooltip";
import { ConfirmProvider } from "./hooks/useConfirm";
import { Toaster } from "./components/ui/sonner";

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

	const { createWorkflow, attachWorkflowToLane } = useWorkflow();
	const [activeTab, setActiveTab] = useState<"board" | "workflows">("board");
	const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

	// Global keyboard shortcuts: ⌘1 → Board, ⌘2 → Workflows
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (!e.metaKey && !e.ctrlKey) return;
			if (e.key === "1") {
				e.preventDefault();
				setActiveTab("board");
			} else if (e.key === "2") {
				e.preventDefault();
				setActiveTab("workflows");
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, []);

	const handleEditWorkflowFromLane = (_laneId: string, _laneName: string, workflowId: string) => {
		setSelectedWorkflowId(workflowId);
		setActiveTab("workflows");
	};

	const handleCreateWorkflowForLane = useCallback(async (laneId: string, laneName: string) => {
		const workflow = await createWorkflow(`${laneName} Workflow`);
		await attachWorkflowToLane(laneId, workflow.id);
		setActiveTab("workflows");
	}, [createWorkflow, attachWorkflowToLane]);

	const handleCreateWorkflow = useCallback(async () => {
		return await createWorkflow("Untitled Workflow");
	}, [createWorkflow]);

	if (!project || !boardData) {
		return (
			<ConfirmProvider><TooltipProvider>
				<WelcomeScreen
					recentProjects={recentProjects}
					onOpenProject={openProjectPicker}
					onSelectRecent={openProject}
					onRemoveRecent={removeRecentProject}
				/>
				<Toaster position="bottom-right" />
			</TooltipProvider></ConfirmProvider>
		);
	}

	if (activeTab === "workflows") {
		return (
			<ConfirmProvider><TooltipProvider>
				<div className="h-screen flex flex-col bg-[#0d1117]">
					<BoardHeader
						board={boardData.board}
						projectName={project.name}
						recentProjects={recentProjects}
						activeTab="workflows"
						onUpdateName={() => {}}
						onSwitchProject={openProject}
						onOpenProjectPicker={openProjectPicker}
						onCloseProject={closeProject}
						onSetTab={setActiveTab}
					/>
					<WorkflowListView
						lanes={boardData.lanes}
						onCreateWorkflow={handleCreateWorkflow}
						selectedId={selectedWorkflowId}
						onSelectWorkflow={setSelectedWorkflowId}
					/>
				</div>
				<Toaster position="bottom-right" />
			</TooltipProvider></ConfirmProvider>
		);
	}

	return (
		<ConfirmProvider><TooltipProvider>
			<BoardView
				boardData={boardData}
				setBoardData={setBoardData}
				projectName={project.name}
				recentProjects={recentProjects}
				onSwitchProject={openProject}
				onOpenProjectPicker={openProjectPicker}
				onCloseProject={closeProject}
				onEditWorkflow={handleEditWorkflowFromLane}
				activeTab="board"
				onSetTab={setActiveTab}
				onCreateWorkflowForLane={handleCreateWorkflowForLane}
			/>
			<Toaster position="bottom-right" />
		</TooltipProvider></ConfirmProvider>
	);
}
