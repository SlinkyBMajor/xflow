import { useState } from "react";
import type { Lane } from "../../../shared/types";
import { Modal } from "../shared/Modal";

interface LaneSettingsModalProps {
	open: boolean;
	lane: Lane;
	onClose: () => void;
	onSave: (updates: { name?: string; color?: string; wipLimit?: number | null }) => void;
}

const COLOR_OPTIONS = [
	"#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
	"#f59e0b", "#22c55e", "#06b6d4", "#3b82f6",
	"#71717a",
];

export function LaneSettingsModal({ open, lane, onClose, onSave }: LaneSettingsModalProps) {
	const [name, setName] = useState(lane.name);
	const [color, setColor] = useState(lane.color || "#71717a");
	const [wipLimit, setWipLimit] = useState<string>(
		lane.wipLimit !== null ? String(lane.wipLimit) : "",
	);

	const handleSubmit = () => {
		onSave({
			name: name.trim() || lane.name,
			color,
			wipLimit: wipLimit ? parseInt(wipLimit, 10) : null,
		});
	};

	return (
		<Modal open={open} onClose={onClose}>
			<div className="p-5">
				<h3 className="text-sm font-semibold text-zinc-200 mb-4">Lane Settings</h3>

				<div className="space-y-4">
					{/* Name */}
					<div>
						<label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-1.5">
							Name
						</label>
						<input
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50"
						/>
					</div>

					{/* Color */}
					<div>
						<label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-2">
							Color
						</label>
						<div className="flex gap-2">
							{COLOR_OPTIONS.map((c) => (
								<button
									key={c}
									onClick={() => setColor(c)}
									className={`w-6 h-6 rounded-full border-2 transition-all ${
										color === c
											? "border-white scale-110"
											: "border-transparent hover:border-zinc-600"
									}`}
									style={{ backgroundColor: c }}
								/>
							))}
						</div>
					</div>

					{/* WIP Limit */}
					<div>
						<label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-1.5">
							WIP Limit
						</label>
						<input
							type="number"
							min="0"
							value={wipLimit}
							onChange={(e) => setWipLimit(e.target.value)}
							placeholder="No limit"
							className="w-24 text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-600 outline-none focus:border-violet-500/50"
						/>
					</div>
				</div>

				{/* Actions */}
				<div className="flex justify-end gap-2 mt-6">
					<button
						onClick={onClose}
						className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 rounded-md hover:bg-zinc-800 transition-colors"
					>
						Cancel
					</button>
					<button
						onClick={handleSubmit}
						className="px-4 py-1.5 text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-md transition-colors"
					>
						Save
					</button>
				</div>
			</div>
		</Modal>
	);
}
