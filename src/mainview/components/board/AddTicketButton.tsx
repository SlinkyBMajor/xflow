import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useToggleInput } from "../../hooks/useToggleInput";

interface AddTicketButtonProps {
	onAdd: (title: string) => void;
}

export function AddTicketButton({ onAdd }: AddTicketButtonProps) {
	const { active, setActive, inputProps } = useToggleInput(onAdd);

	if (!active) {
		return (
			<Button
				variant="ghost"
				onClick={() => setActive(true)}
				className="flex items-center gap-1.5 w-full justify-start px-1 py-1 h-auto text-[#6e7681] hover:text-[#8b949e] hover:bg-transparent text-[11px]"
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
				{...inputProps}
				placeholder="Ticket title..."
				className="text-[13px] bg-[#0d1117]/60 border-[#30363d] focus:border-[#58a6ff]/40"
			/>
		</div>
	);
}
