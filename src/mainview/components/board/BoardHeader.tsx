import { useState, useRef, useEffect } from "react";
import type { Board } from "../../../shared/types";

interface BoardHeaderProps {
	board: Board;
	projectName: string;
	onUpdateName: (name: string) => void;
}

export function BoardHeader({ board, projectName, onUpdateName }: BoardHeaderProps) {
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

			{/* Project name (dim) */}
			<span className="text-[11px] text-zinc-600 font-mono tracking-wide">
				{projectName}
			</span>

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
