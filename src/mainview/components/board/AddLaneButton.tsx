import { Input } from "../ui/input";
import { useToggleInput } from "../../hooks/useToggleInput";

interface AddLaneButtonProps {
	onAdd: (name: string, color?: string) => void;
}

const LANE_COLORS = ["#6366f1", "#f59e0b", "#22c55e", "#ef4444", "#06b6d4", "#ec4899", "#8b5cf6", "#f97316"];

export function AddLaneButton({ onAdd }: AddLaneButtonProps) {
	const { active, setActive, inputProps } = useToggleInput((name) => {
		const color = LANE_COLORS[Math.floor(Math.random() * LANE_COLORS.length)];
		onAdd(name, color);
	});

	if (!active) {
		return (
			<button
				onClick={() => setActive(true)}
				className="flex items-center gap-2 w-72 flex-shrink-0 px-1 py-1.5 text-[#6e7681] hover:text-[#8b949e] text-[12px] font-medium transition-colors"
			>
				<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
					<path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
				</svg>
				Add lane
			</button>
		);
	}

	return (
		<div className="w-72 flex-shrink-0 animate-scale-in">
			<Input
				{...inputProps}
				placeholder="Lane name..."
			/>
		</div>
	);
}
