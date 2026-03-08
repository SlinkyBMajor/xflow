import type { RecentProject } from "../../../shared/types";
import { Button } from "../ui/button";

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
					className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#161b22] cursor-pointer transition-colors duration-100"
					onClick={() => onSelect(project.path)}
				>
					<div className="w-7 h-7 rounded-md bg-[#21262d] border border-[#30363d] flex items-center justify-center flex-shrink-0">
						<span className="text-xs font-semibold text-[#8b949e]" style={{ fontFamily: "var(--font-display)" }}>
							{project.name.charAt(0).toUpperCase()}
						</span>
					</div>
					<div className="flex-1 min-w-0">
						<div className="text-[13px] font-medium text-[#e6edf3] truncate">
							{project.name}
						</div>
						<div className="text-[11px] text-[#6e7681] truncate font-mono">
							{shortenPath(project.path)}
						</div>
					</div>
					<span className="text-[11px] text-[#6e7681] flex-shrink-0 group-hover:hidden">
						{formatDate(project.lastOpened)}
					</span>
					<Button
						variant="ghost"
						size="icon"
						className="hidden group-hover:flex h-6 w-6 text-[#8b949e] hover:text-[#e6edf3]"
						onClick={(e) => {
							e.stopPropagation();
							onRemove(project.path);
						}}
					>
						<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
							<path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
						</svg>
					</Button>
				</div>
			))}
		</div>
	);
}
