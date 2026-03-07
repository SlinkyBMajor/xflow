import { useState, useEffect } from "react";
import type { Lane, Workflow } from "../../../shared/types";
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
	onDelete: () => void;
	onEditWorkflow: (laneId: string, laneName: string, workflowId: string) => void;
	onCreateWorkflowForLane: (laneId: string, laneName: string) => Promise<void>;
}

const COLOR_OPTIONS = [
	"#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
	"#f59e0b", "#22c55e", "#06b6d4", "#3b82f6",
	"#71717a",
];

function relativeTime(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	const days = Math.floor(hrs / 24);
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	return `${months}mo ago`;
}

export function LaneSettingsModal({ open, lane, onClose, onSave, onDelete, onEditWorkflow, onCreateWorkflowForLane }: LaneSettingsModalProps) {
	const [name, setName] = useState(lane.name);
	const [color, setColor] = useState(lane.color || "#71717a");
	const [wipLimit, setWipLimit] = useState<string>(
		lane.wipLimit !== null ? String(lane.wipLimit) : "",
	);
	const { getWorkflow, attachWorkflowToLane } = useWorkflow();
	const [workflow, setWorkflow] = useState<Workflow | null>(null);

	useEffect(() => {
		if (open && lane.workflowId) {
			getWorkflow(lane.workflowId).then(setWorkflow);
		} else {
			setWorkflow(null);
		}
	}, [open, lane.workflowId, getWorkflow]);

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
						{lane.workflowId && workflow ? (
							<div className="rounded-lg border border-zinc-800/60 bg-zinc-900/50 p-3">
								<div className="flex items-start justify-between gap-2">
									<div className="min-w-0">
										<p className="text-sm font-medium text-zinc-200 truncate">
											{workflow.name}
										</p>
										<p className="text-[11px] text-zinc-600 font-mono mt-0.5">
											Updated {relativeTime(workflow.updatedAt)}
										</p>
									</div>
								</div>
								<div className="flex gap-2 mt-3">
									<Button
										size="sm"
										variant="ghost"
										onClick={() => {
											onClose();
											onEditWorkflow(lane.id, lane.name, lane.workflowId!);
										}}
										className="text-violet-400 hover:text-violet-300 h-7 text-xs"
									>
										Edit
									</Button>
									<Button
										size="sm"
										variant="ghost"
										onClick={async () => {
											await attachWorkflowToLane(lane.id, null);
											setWorkflow(null);
										}}
										className="text-zinc-500 hover:text-red-400 h-7 text-xs"
									>
										Detach
									</Button>
								</div>
							</div>
						) : (
							<div className="rounded-lg border border-dashed border-zinc-800 p-3 text-center">
								<p className="text-xs text-zinc-600 mb-2">No workflow attached</p>
								<Button
									size="sm"
									onClick={async () => {
										onClose();
										await onCreateWorkflowForLane(lane.id, lane.name);
									}}
									className="bg-violet-600 hover:bg-violet-500 text-white text-xs h-7"
								>
									Create Workflow
								</Button>
							</div>
						)}
					</div>

					<DialogFooter className="mt-6 flex items-center">
						<Button
							variant="ghost"
							size="sm"
							onClick={onDelete}
							className="mr-auto text-zinc-500 hover:text-red-400 hover:bg-red-900/20"
						>
							Delete lane
						</Button>
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
