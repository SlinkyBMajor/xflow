import { useState } from "react";
import type { Lane } from "../../../shared/types";
import { useWorkflow } from "../../hooks/useWorkflow";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";

interface LaneSettingsModalProps {
	open: boolean;
	lane: Lane;
	onClose: () => void;
	onSave: (updates: { name?: string; color?: string; wipLimit?: number | null }) => void;
	onEditWorkflow: (laneId: string, laneName: string, workflowId: string) => void;
}

const COLOR_OPTIONS = [
	"#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
	"#f59e0b", "#22c55e", "#06b6d4", "#3b82f6",
	"#71717a",
];

export function LaneSettingsModal({ open, lane, onClose, onSave, onEditWorkflow }: LaneSettingsModalProps) {
	const [name, setName] = useState(lane.name);
	const [color, setColor] = useState(lane.color || "#71717a");
	const [wipLimit, setWipLimit] = useState<string>(
		lane.wipLimit !== null ? String(lane.wipLimit) : "",
	);
	const { createWorkflow, attachWorkflowToLane } = useWorkflow();

	const handleSubmit = () => {
		onSave({
			name: name.trim() || lane.name,
			color,
			wipLimit: wipLimit ? parseInt(wipLimit, 10) : null,
		});
	};

	return (
		<Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
			<DialogContent>
				<div className="p-5">
					<DialogHeader className="mb-4">
						<DialogTitle>Lane Settings</DialogTitle>
						<DialogDescription className="sr-only">
							Edit lane name, color, and WIP limit
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<div>
							<Label htmlFor="lane-name" className="mb-1.5">Name</Label>
							<Input
								id="lane-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>

						<div>
							<Label className="mb-2">Color</Label>
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

						<div>
							<Label htmlFor="wip-limit" className="mb-1.5">WIP Limit</Label>
							<Input
								id="wip-limit"
								type="number"
								min="0"
								value={wipLimit}
								onChange={(e) => setWipLimit(e.target.value)}
								placeholder="No limit"
								className="w-24"
							/>
						</div>
					</div>

					{/* Workflow section */}
					<div className="mt-4 pt-4 border-t border-zinc-800">
						<Label className="mb-2">Workflow</Label>
						{lane.workflowId ? (
							<div className="flex gap-2">
								<Button
									size="sm"
									variant="ghost"
									onClick={() => {
										onClose();
										onEditWorkflow(lane.id, lane.name, lane.workflowId!);
									}}
									className="text-violet-400 hover:text-violet-300"
								>
									Edit Workflow
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onClick={async () => {
										await attachWorkflowToLane(lane.id, null);
									}}
									className="text-zinc-400 hover:text-red-400"
								>
									Detach Workflow
								</Button>
							</div>
						) : (
							<Button
								size="sm"
								variant="ghost"
								onClick={async () => {
									const workflow = await createWorkflow(`${lane.name} Workflow`);
									await attachWorkflowToLane(lane.id, workflow.id);
									onClose();
									onEditWorkflow(lane.id, lane.name, workflow.id);
								}}
								className="text-violet-400 hover:text-violet-300"
							>
								Create Workflow
							</Button>
						)}
					</div>

					<DialogFooter className="mt-6">
						<Button variant="ghost" size="sm" onClick={onClose}>
							Cancel
						</Button>
						<Button size="sm" onClick={handleSubmit} className="bg-violet-600 hover:bg-violet-500 text-white">
							Save
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
