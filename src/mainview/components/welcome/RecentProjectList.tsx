import type { RecentProject } from "../../../shared/types";

interface RecentProjectListProps {
	projects: RecentProject[];
	onSelect: (path: string) => void;
	onRemove: (path: string) => void;
}

function formatDate(iso: string): string {
	const d = new Date(iso);
	const now = new Date();
	const diffMs = now.getTime() - d.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	if (diffMins < 1) return "just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return `${diffHours}h ago`;
	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) return `${diffDays}d ago`;
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function shortenPath(path: string): string {
	const home = path.replace(/^\/Users\/[^/]+/, "~");
	if (home.length <= 40) return home;
	const parts = home.split("/");
	if (parts.length <= 3) return home;
	return `${parts[0]}/.../${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

export function RecentProjectList({ projects, onSelect, onRemove }: RecentProjectListProps) {
	return (
		<div className="space-y-0.5">
			{projects.map((project) => (
				<div
					key={project.path}
					className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/60 cursor-pointer transition-colors duration-100"
					onClick={() => onSelect(project.path)}
				>
					<div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700/50 flex items-center justify-center flex-shrink-0">
						<span className="text-xs font-semibold text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
							{project.name.charAt(0).toUpperCase()}
						</span>
					</div>
					<div className="flex-1 min-w-0">
						<div className="text-[13px] font-medium text-zinc-200 truncate">
							{project.name}
						</div>
						<div className="text-[11px] text-zinc-600 truncate font-mono">
							{shortenPath(project.path)}
						</div>
					</div>
					<span className="text-[11px] text-zinc-600 flex-shrink-0 group-hover:hidden">
						{formatDate(project.lastOpened)}
					</span>
					<button
						className="hidden group-hover:flex items-center justify-center w-6 h-6 rounded-md hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
						onClick={(e) => {
							e.stopPropagation();
							onRemove(project.path);
						}}
					>
						<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
							<path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
						</svg>
					</button>
				</div>
			))}
		</div>
	);
}
