import type { RecentProject } from "../../../shared/types";
import { Button } from "../ui/button";
import { RecentProjectList } from "./RecentProjectList";
import { toggleMaximize } from "../../rpc";

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
			{/* Window drag region */}
			<div onDoubleClick={toggleMaximize} className="absolute top-0 left-0 right-0 h-12 electrobun-webkit-app-region-drag z-20" />
			{/* Atmospheric background */}
			<div className="absolute inset-0 bg-[#0d1117]">
				<div
					className="absolute inset-0 opacity-30"
					style={{
						background:
							"radial-gradient(ellipse 80% 50% at 50% 40%, rgba(88, 166, 255, 0.06), transparent)",
					}}
				/>
				<div
					className="absolute inset-0"
					style={{
						backgroundImage: `radial-gradient(rgba(139, 148, 158, 0.05) 1px, transparent 1px)`,
						backgroundSize: "24px 24px",
					}}
				/>
			</div>

			<div className="relative z-10 w-full max-w-md px-8 animate-slide-up">
				{/* Logo / Title */}
				<div className="text-center mb-10">
					<div className="inline-flex items-center gap-3 mb-4">
						<div className="w-8 h-8 rounded-lg bg-[#58a6ff]/15 border border-[#58a6ff]/25 flex items-center justify-center">
							<svg
								width="16"
								height="16"
								viewBox="0 0 16 16"
								fill="none"
								className="text-[#58a6ff]"
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
							className="text-2xl font-semibold tracking-tight text-[#e6edf3]"
							style={{ fontFamily: "var(--font-display)" }}
						>
							XFlow
						</h1>
					</div>
					<p className="text-sm text-[#8b949e] leading-relaxed">
						Agentic Kanban board with workflow engines.
						<br />
						Open a project directory to begin.
					</p>
				</div>

				{/* Open Project Button */}
				<Button
					onClick={onOpenProject}
					className="w-full gap-2.5 py-3 h-auto bg-[#238636] hover:bg-[#2ea043] text-white shadow-lg shadow-[#238636]/20 hover:shadow-[#2ea043]/30"
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
				</Button>

				{/* Recent Projects */}
				{recentProjects.length > 0 && (
					<div className="mt-8">
						<div className="flex items-center gap-2 mb-3 px-1">
							<span className="text-[11px] font-medium uppercase tracking-wider text-[#6e7681]">
								Recent
							</span>
							<div className="flex-1 h-px bg-[#21262d]" />
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
			<div className="absolute bottom-4 text-[10px] text-[#484f58] font-mono">
				v0.1.0
			</div>
		</div>
	);
}
