import type { RecentProject } from "../../../shared/types";
import { RecentProjectList } from "./RecentProjectList";

interface WelcomeScreenProps {
	recentProjects: RecentProject[];
	onOpenProject: () => void;
	onSelectRecent: (path: string) => void;
	onRemoveRecent: (path: string) => void;
}

export function WelcomeScreen({
	recentProjects,
	onOpenProject,
	onSelectRecent,
	onRemoveRecent,
}: WelcomeScreenProps) {
	return (
		<div className="h-screen flex flex-col items-center justify-center relative overflow-hidden">
			{/* Atmospheric background */}
			<div className="absolute inset-0 bg-zinc-950">
				<div
					className="absolute inset-0 opacity-30"
					style={{
						background:
							"radial-gradient(ellipse 80% 50% at 50% 40%, rgba(167, 139, 250, 0.08), transparent)",
					}}
				/>
				<div
					className="absolute inset-0"
					style={{
						backgroundImage: `radial-gradient(rgba(161, 161, 170, 0.06) 1px, transparent 1px)`,
						backgroundSize: "24px 24px",
					}}
				/>
			</div>

			<div className="relative z-10 w-full max-w-md px-8 animate-slide-up">
				{/* Logo / Title */}
				<div className="text-center mb-10">
					<div className="inline-flex items-center gap-3 mb-4">
						<div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
							<svg
								width="16"
								height="16"
								viewBox="0 0 16 16"
								fill="none"
								className="text-violet-400"
							>
								<path
									d="M2 4h4v4H2V4zm0 6h4v4H2v-4zm6-6h4v4H8V4zm0 6h4v4H8v-4z"
									fill="currentColor"
									opacity="0.6"
								/>
								<path d="M14 2h-2v2h2V2z" fill="currentColor" />
							</svg>
						</div>
						<h1
							className="text-2xl font-semibold tracking-tight text-zinc-100"
							style={{ fontFamily: "var(--font-display)" }}
						>
							XFlow
						</h1>
					</div>
					<p className="text-sm text-zinc-500 leading-relaxed">
						Agentic Kanban board with workflow engines.
						<br />
						Open a project directory to begin.
					</p>
				</div>

				{/* Open Project Button */}
				<button
					onClick={onOpenProject}
					className="w-full group relative flex items-center justify-center gap-2.5 px-5 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all duration-150 shadow-lg shadow-violet-900/30 hover:shadow-violet-800/40"
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="none"
						className="opacity-80"
					>
						<path
							d="M2 3.5A1.5 1.5 0 013.5 2h3.379a1.5 1.5 0 011.06.44l.622.62a.5.5 0 00.354.147H12.5A1.5 1.5 0 0114 4.707V12.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-9z"
							stroke="currentColor"
							strokeWidth="1.5"
							fill="none"
						/>
					</svg>
					Open Project
				</button>

				{/* Recent Projects */}
				{recentProjects.length > 0 && (
					<div className="mt-8">
						<div className="flex items-center gap-2 mb-3 px-1">
							<span className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
								Recent
							</span>
							<div className="flex-1 h-px bg-zinc-800/80" />
						</div>
						<RecentProjectList
							projects={recentProjects}
							onSelect={onSelectRecent}
							onRemove={onRemoveRecent}
						/>
					</div>
				)}
			</div>

			{/* Version tag */}
			<div className="absolute bottom-4 text-[10px] text-zinc-700 font-mono">
				v0.1.0
			</div>
		</div>
	);
}
