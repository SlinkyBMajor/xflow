import { useState, useRef, useEffect } from "react";
import { Settings } from "lucide-react";
import type { Board, BoardSettings, RecentProject } from "../../../shared/types";
import { toggleMaximize } from "../../rpc";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

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
	onOpenSettings?: () => void;
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
	onOpenSettings,
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
		<header onDoubleClick={toggleMaximize} className="flex items-center pt-7 h-[76px] border-b border-[#21262d] flex-shrink-0 bg-[#0d1117]/80 backdrop-blur-sm electrobun-webkit-app-region-drag">
			{/* Left section: logo + project + board name */}
			<div className="flex items-center gap-3 px-4 min-w-0 flex-1 electrobun-webkit-app-region-no-drag">
				{/* Logo mark */}
				<div className="flex items-center gap-2 pr-3 border-r border-[#21262d]">
					<div className="w-5 h-5 rounded bg-[#58a6ff]/15 border border-[#58a6ff]/25 flex items-center justify-center">
						<svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-[#58a6ff]">
							<path d="M2 4h4v4H2V4zm0 6h4v4H2v-4zm6-6h4v4H8V4zm0 6h4v4H8v-4z" fill="currentColor" opacity="0.6" />
							<path d="M14 2h-2v2h2V2z" fill="currentColor" />
						</svg>
					</div>
				</div>

				{/* Project switcher */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button className="flex items-center gap-1.5 text-[11px] text-[#8b949e] hover:text-[#e6edf3] font-mono tracking-wide transition-colors rounded px-1.5 py-1 -mx-1.5 hover:bg-[#21262d]">
							{projectName}
							<svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-[#6e7681]">
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
								<div className="w-5 h-5 rounded bg-[#21262d] border border-[#30363d] flex items-center justify-center flex-shrink-0">
									<span className="text-[9px] font-semibold text-[#8b949e]" style={{ fontFamily: "var(--font-display)" }}>
										{p.name.charAt(0).toUpperCase()}
									</span>
								</div>
								<div className="flex-1 min-w-0">
									<div className="text-[12px] font-medium text-[#e6edf3] truncate">{p.name}</div>
								</div>
								{p.name === projectName && (
									<div className="w-1.5 h-1.5 rounded-full bg-[#58a6ff] flex-shrink-0" />
								)}
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={onOpenProjectPicker} className="text-[#8b949e] hover:text-[#e6edf3]">
							<svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-0.5">
								<path d="M2 3.5A1.5 1.5 0 013.5 2h2.379a1.5 1.5 0 011.06.44l.622.62a.5.5 0 00.354.147H10.5A1.5 1.5 0 0112 4.707V10.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 012 10.5v-7z" stroke="currentColor" strokeWidth="1.2" fill="none" />
							</svg>
							Open another project...
						</DropdownMenuItem>
						<DropdownMenuItem onClick={onCloseProject} className="text-[#6e7681] hover:text-[#8b949e]">
							<svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-0.5">
								<path d="M9 5L5 9M5 5l4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
							</svg>
							Close project
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<span className="text-[#30363d]">/</span>

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
						className="text-sm font-semibold text-[#e6edf3] hover:text-white transition-colors"
					>
						{board.name}
					</button>
				)}
			</div>

			{/* Center: View switcher — GitHub Desktop style */}
			<div className="flex items-center electrobun-webkit-app-region-no-drag">
				<div className="flex items-center bg-[#161b22] rounded-lg p-0.5 border border-[#21262d]">
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={() => onSetTab("board")}
								className={`view-tab ${activeTab === "board" ? "view-tab-active" : "view-tab-inactive"}`}
							>
								{/* Kanban board icon */}
								<svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
									<rect x="1.5" y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.3" />
									<rect x="6.5" y="2" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" />
									<rect x="11.5" y="2" width="3" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" />
								</svg>
								<span>Board</span>
								<kbd className="view-tab-kbd">⌘1</kbd>
							</button>
						</TooltipTrigger>
						<TooltipContent side="bottom" className="text-xs">
							Board view <span className="text-[#6e7681] ml-1">⌘1</span>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={() => onSetTab("workflows")}
								className={`view-tab ${activeTab === "workflows" ? "view-tab-active" : "view-tab-inactive"}`}
							>
								{/* Workflow/graph icon */}
								<svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
									<circle cx="3" cy="4" r="2" stroke="currentColor" strokeWidth="1.3" />
									<circle cx="13" cy="4" r="2" stroke="currentColor" strokeWidth="1.3" />
									<circle cx="8" cy="12" r="2" stroke="currentColor" strokeWidth="1.3" />
									<path d="M4.5 5.5L7 10.5M11.5 5.5L9 10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
								</svg>
								<span>Workflows</span>
								<kbd className="view-tab-kbd">⌘2</kbd>
							</button>
						</TooltipTrigger>
						<TooltipContent side="bottom" className="text-xs">
							Workflows view <span className="text-[#6e7681] ml-1">⌘2</span>
						</TooltipContent>
					</Tooltip>
				</div>
			</div>

			{/* Right section: settings */}
			<div className="flex-1 flex justify-end items-center pr-4 electrobun-webkit-app-region-no-drag">
				{onOpenSettings && (
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={onOpenSettings}
								className="p-1.5 rounded-md text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors"
							>
								<Settings size={14} />
							</button>
						</TooltipTrigger>
						<TooltipContent side="bottom" className="text-xs">
							Settings
						</TooltipContent>
					</Tooltip>
				)}
			</div>
		</header>
	);
}
