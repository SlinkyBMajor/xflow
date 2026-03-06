import { useState, useRef, useEffect } from "react";
import type { Board, RecentProject } from "../../../shared/types";

interface BoardHeaderProps {
	board: Board;
	projectName: string;
	recentProjects: RecentProject[];
	onUpdateName: (name: string) => void;
	onSwitchProject: (path: string) => void;
	onOpenProjectPicker: () => void;
	onCloseProject: () => void;
}

export function BoardHeader({
	board,
	projectName,
	recentProjects,
	onUpdateName,
	onSwitchProject,
	onOpenProjectPicker,
	onCloseProject,
}: BoardHeaderProps) {
	const [editing, setEditing] = useState(false);
	const [name, setName] = useState(board.name);
	const [switcherOpen, setSwitcherOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const switcherRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setName(board.name);
	}, [board.name]);

	useEffect(() => {
		if (editing) inputRef.current?.select();
	}, [editing]);

	useEffect(() => {
		if (!switcherOpen) return;
		const handleClick = (e: MouseEvent) => {
			if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
				setSwitcherOpen(false);
			}
		};
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setSwitcherOpen(false);
		};
		document.addEventListener("mousedown", handleClick);
		document.addEventListener("keydown", handleKey);
		return () => {
			document.removeEventListener("mousedown", handleClick);
			document.removeEventListener("keydown", handleKey);
		};
	}, [switcherOpen]);

	const handleSubmit = () => {
		const trimmed = name.trim();
		if (trimmed && trimmed !== board.name) {
			onUpdateName(trimmed);
		} else {
			setName(board.name);
		}
		setEditing(false);
	};

	return (
		<div className="flex items-center gap-4 px-5 h-12 border-b border-zinc-800/80 flex-shrink-0 bg-zinc-950/80 backdrop-blur-sm">
			{/* Logo mark */}
			<div className="flex items-center gap-2 pr-3 border-r border-zinc-800/60">
				<div className="w-5 h-5 rounded bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
					<svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-violet-400">
						<path d="M2 4h4v4H2V4zm0 6h4v4H2v-4zm6-6h4v4H8V4zm0 6h4v4H8v-4z" fill="currentColor" opacity="0.6" />
						<path d="M14 2h-2v2h2V2z" fill="currentColor" />
					</svg>
				</div>
			</div>

			{/* Project switcher */}
			<div className="relative" ref={switcherRef}>
				<button
					onClick={() => setSwitcherOpen(!switcherOpen)}
					className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 font-mono tracking-wide transition-colors rounded px-1.5 py-1 -mx-1.5 hover:bg-zinc-800/60"
				>
					{projectName}
					<svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-zinc-600">
						<path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</button>

				{switcherOpen && (
					<div className="absolute top-full left-0 mt-1 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 py-1 animate-scale-in">
						<div className="px-3 py-1.5">
							<span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
								Projects
							</span>
						</div>
						{recentProjects.map((p) => (
							<button
								key={p.path}
								onClick={() => {
									onSwitchProject(p.path);
									setSwitcherOpen(false);
								}}
								className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-800/60 transition-colors"
							>
								<div className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700/50 flex items-center justify-center flex-shrink-0">
									<span className="text-[9px] font-semibold text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
										{p.name.charAt(0).toUpperCase()}
									</span>
								</div>
								<div className="flex-1 min-w-0">
									<div className="text-[12px] font-medium text-zinc-300 truncate">{p.name}</div>
								</div>
								{p.name === projectName && (
									<div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
								)}
							</button>
						))}
						<div className="border-t border-zinc-800 mt-1 pt-1">
							<button
								onClick={() => {
									onOpenProjectPicker();
									setSwitcherOpen(false);
								}}
								className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-800/60 transition-colors text-[12px] text-zinc-400 hover:text-zinc-200"
							>
								<svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-0.5">
									<path d="M2 3.5A1.5 1.5 0 013.5 2h2.379a1.5 1.5 0 011.06.44l.622.62a.5.5 0 00.354.147H10.5A1.5 1.5 0 0112 4.707V10.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 012 10.5v-7z" stroke="currentColor" strokeWidth="1.2" fill="none" />
								</svg>
								Open another project...
							</button>
							<button
								onClick={() => {
									onCloseProject();
									setSwitcherOpen(false);
								}}
								className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-800/60 transition-colors text-[12px] text-zinc-500 hover:text-zinc-300"
							>
								<svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-0.5">
									<path d="M9 5L5 9M5 5l4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
								</svg>
								Close project
							</button>
						</div>
					</div>
				)}
			</div>

			<span className="text-zinc-700">/</span>

			{/* Board name (editable) */}
			{editing ? (
				<input
					ref={inputRef}
					value={name}
					onChange={(e) => setName(e.target.value)}
					onBlur={handleSubmit}
					onKeyDown={(e) => {
						if (e.key === "Enter") handleSubmit();
						if (e.key === "Escape") {
							setName(board.name);
							setEditing(false);
						}
					}}
					className="text-sm font-semibold bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-zinc-100 outline-none focus:border-violet-500/50 w-48"
					style={{ fontFamily: "var(--font-body)" }}
				/>
			) : (
				<button
					onClick={() => setEditing(true)}
					className="text-sm font-semibold text-zinc-200 hover:text-zinc-50 transition-colors"
				>
					{board.name}
				</button>
			)}
		</div>
	);
}
