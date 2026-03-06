import { useState, useRef, useEffect } from "react";

interface AddLaneButtonProps {
	onAdd: (name: string, color?: string) => void;
}

const LANE_COLORS = ["#6366f1", "#f59e0b", "#22c55e", "#ef4444", "#06b6d4", "#ec4899", "#8b5cf6", "#f97316"];

export function AddLaneButton({ onAdd }: AddLaneButtonProps) {
	const [active, setActive] = useState(false);
	const [name, setName] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (active) inputRef.current?.focus();
	}, [active]);

	const handleSubmit = () => {
		const trimmed = name.trim();
		if (trimmed) {
			const color = LANE_COLORS[Math.floor(Math.random() * LANE_COLORS.length)];
			onAdd(trimmed, color);
		}
		setName("");
		setActive(false);
	};

	if (!active) {
		return (
			<button
				onClick={() => setActive(true)}
				className="flex items-center gap-2 w-72 flex-shrink-0 px-4 py-3 rounded-xl border border-dashed border-zinc-800 hover:border-zinc-700 text-zinc-600 hover:text-zinc-400 text-sm transition-colors"
			>
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
					<path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
				</svg>
				Add lane
			</button>
		);
	}

	return (
		<div className="w-72 flex-shrink-0 bg-zinc-900/50 rounded-xl border border-zinc-700 p-3 animate-scale-in">
			<input
				ref={inputRef}
				value={name}
				onChange={(e) => setName(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") handleSubmit();
					if (e.key === "Escape") {
						setName("");
						setActive(false);
					}
				}}
				onBlur={handleSubmit}
				placeholder="Lane name..."
				className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-600 outline-none focus:border-violet-500/50"
			/>
		</div>
	);
}
