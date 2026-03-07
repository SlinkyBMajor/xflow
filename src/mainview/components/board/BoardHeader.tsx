import { useState, useRef, useEffect } from "react";
import type { Board, RecentProject } from "../../../shared/types";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";

interface BoardHeaderProps {
	board: Board;
	projectName: string;
	recentProjects: RecentProject[];
	activeTab: "board" | "workflows";
	onUpdateName: (name: string) => void;
	onSwitchProject: (path: string) => void;
	onOpenProjectPicker: () => void;
	onCloseProject: () => void;
	onSetTab: (tab: "board" | "workflows") => void;
}

export function BoardHeader({
	board,
	projectName,
	recentProjects,
	activeTab,
	onUpdateName,
	onSwitchProject,
	onOpenProjectPicker,
	onCloseProject,
	onSetTab,
}: BoardHeaderProps) {
	const [editing, setEditing] = useState(false);
	const [name, setName] = useState(board.name);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setName(board.name);
	}, [board.name]);

	useEffect(() => {
		if (editing) inputRef.current?.select();
	}, [editing]);

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
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 font-mono tracking-wide transition-colors rounded px-1.5 py-1 -mx-1.5 hover:bg-zinc-800/60">
						{projectName}
						<svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-zinc-600">
							<path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-64">
					<DropdownMenuLabel>Projects</DropdownMenuLabel>
					{recentProjects.map((p) => (
						<DropdownMenuItem
							key={p.path}
							onClick={() => onSwitchProject(p.path)}
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
						</DropdownMenuItem>
					))}
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={onOpenProjectPicker} className="text-zinc-400 hover:text-zinc-200">
						<svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-0.5">
							<path d="M2 3.5A1.5 1.5 0 013.5 2h2.379a1.5 1.5 0 011.06.44l.622.62a.5.5 0 00.354.147H10.5A1.5 1.5 0 0112 4.707V10.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 012 10.5v-7z" stroke="currentColor" strokeWidth="1.2" fill="none" />
						</svg>
						Open another project...
					</DropdownMenuItem>
					<DropdownMenuItem onClick={onCloseProject} className="text-zinc-500 hover:text-zinc-300">
						<svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-0.5">
							<path d="M9 5L5 9M5 5l4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
						</svg>
						Close project
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<span className="text-zinc-700">/</span>

			{/* Board name (editable) */}
			{editing ? (
				<Input
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
					className="text-sm font-semibold w-48 h-7 px-2 py-0.5"
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

			<div className="flex-1" />

			{/* Tab switcher */}
			<div className="flex items-center gap-0.5 bg-zinc-900/60 rounded-md p-0.5 border border-zinc-800/40">
				<button
					onClick={() => onSetTab("board")}
					className={`flex items-center gap-1.5 text-[11px] font-mono tracking-wide transition-all rounded px-2.5 py-1 ${
						activeTab === "board"
							? "bg-zinc-800 text-zinc-200 shadow-sm"
							: "text-zinc-500 hover:text-zinc-300"
					}`}
				>
					Board
				</button>
				<button
					onClick={() => onSetTab("workflows")}
					className={`flex items-center gap-1.5 text-[11px] font-mono tracking-wide transition-all rounded px-2.5 py-1 ${
						activeTab === "workflows"
							? "bg-zinc-800 text-zinc-200 shadow-sm"
							: "text-zinc-500 hover:text-zinc-300"
					}`}
				>
					Workflows
				</button>
			</div>
		</div>
	);
}
