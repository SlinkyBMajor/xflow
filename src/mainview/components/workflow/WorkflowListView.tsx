import { useState, useEffect, useCallback } from "react";
import type { Workflow, Lane } from "../../../shared/types";
import { useWorkflow } from "../../hooks/useWorkflow";
import { WorkflowEditor } from "./WorkflowEditor";
import { Button } from "../ui/button";

interface WorkflowListViewProps {
	lanes: Lane[];
	onCreateWorkflow: () => Promise<Workflow>;
	selectedId: string | null;
	onSelectWorkflow: (id: string | null) => void;
}

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

export function WorkflowListView({ lanes, onCreateWorkflow, selectedId, onSelectWorkflow }: WorkflowListViewProps) {
	const { listWorkflows, deleteWorkflow } = useWorkflow();
	const [workflows, setWorkflows] = useState<Workflow[]>([]);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		const list = await listWorkflows();
		setWorkflows(list);
		setLoading(false);
	}, [listWorkflows]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const handleDelete = async (e: React.MouseEvent, id: string) => {
		e.stopPropagation();
		await deleteWorkflow(id);
		if (selectedId === id) onSelectWorkflow(null);
		refresh();
	};

	const handleCreate = async () => {
		const wf = await onCreateWorkflow();
		await refresh();
		onSelectWorkflow(wf.id);
	};

	const getLanesForWorkflow = (workflowId: string) =>
		lanes.filter((l) => l.workflowId === workflowId);

	return (
		<div className="flex-1 flex overflow-hidden">
			{/* Sidebar */}
			<div className="w-60 flex-shrink-0 border-r border-[#21262d] flex flex-col bg-[#161b22]/30">
				{/* Sidebar header */}
				<div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d]/40">
					<span className="text-[10px] text-[#6e7681] font-mono tracking-widest uppercase">Workflows</span>
					<Button
						size="sm"
						onClick={handleCreate}
						className="bg-[#238636] hover:bg-[#2ea043] text-white text-[11px] h-6 px-2"
					>
						<svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="mr-1">
							<path d="M5 2V8M2 5H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
						</svg>
						New
					</Button>
				</div>

				{/* Workflow list */}
				<div className="flex-1 overflow-y-auto py-1">
					{loading ? (
						<div className="flex items-center justify-center h-24">
							<span className="text-[11px] text-[#6e7681] font-mono">Loading...</span>
						</div>
					) : workflows.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-48 px-4 gap-3">
							<div className="w-10 h-10 rounded-lg bg-[#161b22] border border-[#21262d] flex items-center justify-center">
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#484f58]">
									<path d="M3 5h3v3H3V5zm0 5h3v3H3v-3zm5-5h3v3H8V5zm0 5h3v3H8v-3z" fill="currentColor" opacity="0.5" />
								</svg>
							</div>
							<p className="text-xs text-[#6e7681] text-center">No workflows yet</p>
							<Button
								size="sm"
								onClick={handleCreate}
								className="bg-[#238636] hover:bg-[#2ea043] text-white text-[11px] h-7"
							>
								Create one
							</Button>
						</div>
					) : (
						workflows.map((wf) => {
							const attached = getLanesForWorkflow(wf.id);
							const isSelected = selectedId === wf.id;
							return (
								<button
									key={wf.id}
									onClick={() => onSelectWorkflow(wf.id)}
									className={`group w-full text-left px-3 py-2.5 transition-all duration-100 border-l-2 ${
										isSelected
											? "bg-[#21262d]/50 border-l-[#58a6ff]"
											: "border-l-transparent hover:bg-[#21262d]/30"
									}`}
								>
									<div className="flex items-center justify-between gap-1">
										<span className={`text-[13px] font-medium truncate ${isSelected ? "text-[#f0f6fc]" : "text-[#e6edf3]"}`}>
											{wf.name}
										</span>
										<button
											onClick={(e) => handleDelete(e, wf.id)}
											className="opacity-0 group-hover:opacity-100 text-[#6e7681] hover:text-red-400 transition-all flex-shrink-0 p-0.5"
										>
											<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
												<path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
											</svg>
										</button>
									</div>
									<div className="flex items-center gap-2 mt-1">
										{attached.length > 0 ? (
											attached.map((lane) => (
												<span
													key={lane.id}
													className="inline-flex items-center gap-1 text-[10px] text-[#8b949e]"
												>
													<span
														className="w-1.5 h-1.5 rounded-full flex-shrink-0"
														style={{ backgroundColor: lane.color || "#71717a" }}
													/>
													{lane.name}
												</span>
											))
										) : (
											<span className="text-[10px] text-[#484f58] italic">unattached</span>
										)}
										<span className="text-[10px] text-[#484f58] font-mono ml-auto">{relativeTime(wf.updatedAt)}</span>
									</div>
								</button>
							);
						})
					)}
				</div>
			</div>

			{/* Editor area */}
			<div className="flex-1 flex flex-col">
				{selectedId ? (
					<WorkflowEditor
						key={selectedId}
						workflowId={selectedId}
						lanes={lanes}
						onBack={() => onSelectWorkflow(null)}
						onNameChange={(id, newName) => {
							setWorkflows((prev) =>
								prev.map((wf) => (wf.id === id ? { ...wf, name: newName } : wf))
							);
						}}
					/>
				) : (
					<div className="flex-1 flex items-center justify-center">
						<div className="text-center">
							<p className="text-sm text-[#8b949e]">Select a workflow to edit</p>
							<p className="text-xs text-[#484f58] mt-1">or create a new one from the sidebar</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
