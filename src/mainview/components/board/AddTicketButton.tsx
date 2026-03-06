import { useState, useRef, useEffect } from "react";

interface AddTicketButtonProps {
	onAdd: (title: string) => void;
}

export function AddTicketButton({ onAdd }: AddTicketButtonProps) {
	const [active, setActive] = useState(false);
	const [title, setTitle] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (active) inputRef.current?.focus();
	}, [active]);

	const handleSubmit = () => {
		const trimmed = title.trim();
		if (trimmed) {
			onAdd(trimmed);
		}
		setTitle("");
		setActive(false);
	};

	if (!active) {
		return (
			<button
				onClick={() => setActive(true)}
				className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40 text-[12px] transition-colors"
			>
				<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
					<path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
				</svg>
				Add ticket
			</button>
		);
	}

	return (
		<div className="animate-scale-in">
			<input
				ref={inputRef}
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") handleSubmit();
					if (e.key === "Escape") {
						setTitle("");
						setActive(false);
					}
				}}
				onBlur={handleSubmit}
				placeholder="Ticket title..."
				className="w-full text-[13px] bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-600 outline-none focus:border-violet-500/40"
			/>
		</div>
	);
}
