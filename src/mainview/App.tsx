import { useProject } from "./hooks/useProject";
import { WelcomeScreen } from "./components/welcome/WelcomeScreen";
import { BoardView } from "./components/board/BoardView";

export default function App() {
	const {
		project,
		boardData,
		setBoardData,
		recentProjects,
		openProjectPicker,
		openProject,
		removeRecentProject,
	} = useProject();

	if (!project || !boardData) {
		return (
			<WelcomeScreen
				recentProjects={recentProjects}
				onOpenProject={openProjectPicker}
				onSelectRecent={openProject}
				onRemoveRecent={removeRecentProject}
			/>
		);
	}

	return (
		<BoardView
			boardData={boardData}
			setBoardData={setBoardData}
			projectName={project.name}
		/>
	);
}
