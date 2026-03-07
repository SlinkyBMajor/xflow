import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

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
			<Button
				variant="ghost"
				onClick={() => setActive(true)}
				className="flex items-center gap-1.5 w-full justify-start px-1 py-1 h-auto text-zinc-600 hover:text-zinc-400 hover:bg-transparent text-[11px]"
			>
				<svg width="10" height="10" viewBox="0 0 10 10" fill="none">
					<path d="M5 1.5v7M1.5 5h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
				</svg>
				Add
			</Button>
		);
	}

	return (
		<div className="animate-scale-in">
			<Input
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
				className="text-[13px] bg-zinc-800/60 border-zinc-700/50 focus:border-violet-500/40"
			/>
		</div>
	);
}
