import { useProject } from "./hooks/useProject";
import { WelcomeScreen } from "./components/welcome/WelcomeScreen";
import { BoardView } from "./components/board/BoardView";
import { TooltipProvider } from "./components/ui/tooltip";

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
			/>
		</TooltipProvider>
	);
}
