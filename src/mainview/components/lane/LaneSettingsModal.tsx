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
import { Switch } from "../ui/switch";

interface LaneSettingsModalProps {
	open: boolean;
	lane: Lane;
	onClose: () => void;
	onSave: (updates: { name?: string; color?: string; wipLimit?: number | null; allowTicketCreation?: boolean }) => void;
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
	const [allowTicketCreation, setAllowTicketCreation] = useState(lane.allowTicketCreation !== false);
	const { getWorkflow, listWorkflows, attachWorkflowToLane } = useWorkflow();
	const [workflow, setWorkflow] = useState<Workflow | null>(null);
	const [allWorkflows, setAllWorkflows] = useState<Workflow[]>([]);

	useEffect(() => {
		if (open) {
			listWorkflows().then(setAllWorkflows);
			if (lane.workflowId) {
				getWorkflow(lane.workflowId).then(setWorkflow);
			} else {
				setWorkflow(null);
			}
		} else {
			setWorkflow(null);
			setAllWorkflows([]);
		}
	}, [open, lane.workflowId, getWorkflow, listWorkflows]);

	const handleSubmit = () => {
		onSave({
			name: name.trim() || lane.name,
			color,
			wipLimit: wipLimit ? parseInt(wipLimit, 10) : null,
			allowTicketCreation,
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
												: "border-transparent hover:border-[#6e7681]"
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

						<div className="flex items-center justify-between">
							<Label htmlFor="allow-ticket-creation">Allow ticket creation</Label>
							<Switch
								id="allow-ticket-creation"
								checked={allowTicketCreation}
								onCheckedChange={setAllowTicketCreation}
							/>
						</div>
					</div>

					{/* Workflow section */}
					<div className="mt-4 pt-4 border-t border-[#21262d]">
						<Label className="mb-2">Workflow</Label>
						{lane.workflowId && workflow ? (
							<div className="rounded-lg border border-[#21262d] bg-[#161b22]/50 p-3">
								<div className="flex items-start justify-between gap-2">
									<div className="min-w-0">
										<p className="text-sm font-medium text-[#e6edf3] truncate">
											{workflow.name}
										</p>
										<p className="text-[11px] text-[#6e7681] font-mono mt-0.5">
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
										className="text-[#58a6ff] hover:text-[#79c0ff] h-7 text-xs"
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
										className="text-[#8b949e] hover:text-red-400 h-7 text-xs"
									>
										Detach
									</Button>
								</div>
							</div>
						) : (
							<div className="rounded-lg border border-dashed border-[#30363d] p-3">
								{allWorkflows.length > 0 ? (
									<>
										<select
											className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-2 py-1.5 text-sm text-[#e6edf3] focus:outline-none focus:border-[#58a6ff] mb-2"
											defaultValue=""
											onChange={async (e) => {
												const id = e.target.value;
												if (id) {
													await attachWorkflowToLane(lane.id, id);
													const w = allWorkflows.find((w) => w.id === id) ?? null;
													setWorkflow(w);
												}
											}}
										>
											<option value="" disabled>Select a workflow...</option>
											{allWorkflows.map((w) => (
												<option key={w.id} value={w.id}>{w.name}</option>
											))}
										</select>
										<div className="text-center">
											<span className="text-[11px] text-[#6e7681]">or </span>
											<button
												onClick={async () => {
													onClose();
													await onCreateWorkflowForLane(lane.id, lane.name);
												}}
												className="text-[11px] text-[#58a6ff] hover:text-[#79c0ff]"
											>
												create a new workflow
											</button>
										</div>
									</>
								) : (
									<div className="text-center">
										<p className="text-xs text-[#6e7681] mb-2">No workflows yet</p>
										<Button
											size="sm"
											onClick={async () => {
												onClose();
												await onCreateWorkflowForLane(lane.id, lane.name);
											}}
											className="bg-[#238636] hover:bg-[#2ea043] text-white text-xs h-7"
										>
											Create Workflow
										</Button>
									</div>
								)}
							</div>
						)}
					</div>

					<DialogFooter className="mt-6 flex items-center">
						<Button
							variant="ghost"
							size="sm"
							onClick={onDelete}
							className="mr-auto text-[#8b949e] hover:text-red-400 hover:bg-red-900/20"
						>
							Delete lane
						</Button>
						<Button variant="ghost" size="sm" onClick={onClose}>
							Cancel
						</Button>
						<Button size="sm" onClick={handleSubmit} className="bg-[#238636] hover:bg-[#2ea043] text-white">
							Save
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
