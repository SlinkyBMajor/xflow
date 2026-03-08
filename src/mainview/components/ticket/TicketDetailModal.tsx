import { useState } from "react";
import type { Ticket } from "../../../shared/types";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { TicketForm } from "./TicketForm";
import { RunEventLog } from "./RunEventLog";
import { useWorkflowRuns } from "../../hooks/useWorkflowRuns";
import { useRunEvents } from "../../hooks/useRunEvents";

interface TicketDetailModalProps {
	open: boolean;
	ticket: Ticket;
	laneName: string;
	laneColor: string | null;
	onClose: () => void;
	onSave: (updates: { title?: string; body?: string; tags?: string[] }) => void;
	onDelete: () => void;
}

interface WorkflowOutputEntry {
	output: string;
	runId: string;
	completedAt: string;
}

export function TicketDetailModal({ open, ticket, laneName, laneColor, onClose, onSave, onDelete }: TicketDetailModalProps) {
	const [copied, setCopied] = useState(false);
	const { runs } = useWorkflowRuns(open ? ticket.id : null);
	const activeRun = runs.find((r) => r.status === "active");
	const { events } = useRunEvents(activeRun?.id ?? null);

	const metadataEntries = Object.entries(ticket.metadata ?? {}).filter(([key]) => !key.startsWith("_"));
	const workflowOutput = (ticket.metadata?._workflowOutput ?? {}) as Record<string, WorkflowOutputEntry>;
	const outputEntries = Object.entries(workflowOutput);

	const copyId = () => {
		navigator.clipboard.writeText(ticket.id);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	return (
		<Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
			<DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
				<DialogTitle className="sr-only">Edit Ticket</DialogTitle>
				<DialogDescription className="sr-only">
					Edit ticket details
				</DialogDescription>

				<div className="flex min-h-[360px] max-h-[85vh]">
					{/* Left pane — editing */}
					<div className="flex-1 p-5 min-w-0 overflow-y-auto scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-transparent">
						<div className="flex items-start justify-between mb-5">
							<span className="text-[10px] font-mono text-[#6e7681] uppercase tracking-wider">
								Ticket
							</span>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={onDelete}
								className="text-[11px] text-[#6e7681] hover:text-red-400 hover:bg-red-900/20 h-auto px-2 py-1"
							>
								Delete
							</Button>
						</div>

						<TicketForm
							initialTitle={ticket.title}
							initialBody={ticket.body || ""}
							initialTags={ticket.tags}
							onSave={onSave}
							onCancel={onClose}
						/>

						{/* Workflow output */}
						{outputEntries.length > 0 && (
							<div className="mt-6 pt-4 border-t border-[#21262d]">
								<span className="text-[10px] font-mono text-[#6e7681] uppercase tracking-wider block mb-3">
									Workflow Output
								</span>
								<div className="space-y-3">
									{outputEntries.map(([nodeId, entry]) => (
										<WorkflowOutputBlock key={nodeId} nodeId={nodeId} entry={entry} />
									))}
								</div>
							</div>
						)}

						{/* Live event log */}
						{activeRun && (
							<div className="mt-6 pt-4 border-t border-[#21262d]">
								<span className="text-[10px] font-mono text-[#6e7681] uppercase tracking-wider block mb-3">
									Workflow Activity
								</span>
								<RunEventLog events={events} isActive={true} />
							</div>
						)}
					</div>

					{/* Right pane — metadata */}
					<div className="w-64 flex-shrink-0 border-l border-[#21262d] bg-[#161b22]/50 p-5 overflow-y-auto">
						<span className="text-[10px] font-mono text-[#6e7681] uppercase tracking-wider">
							Details
						</span>

						<div className="mt-4 space-y-5">
							{/* Lane / Status */}
							<MetadataRow label="Lane">
								<div className="flex items-center gap-2">
									{laneColor && (
										<span
											className="w-2 h-2 rounded-full flex-shrink-0"
											style={{ backgroundColor: laneColor }}
										/>
									)}
									<span className="text-[13px] text-[#e6edf3]">{laneName}</span>
								</div>
							</MetadataRow>

							{/* Active workflow indicator */}
							{activeRun && (
								<MetadataRow label="Workflow">
									<div className="flex items-center gap-2">
										<span className="relative flex h-1.5 w-1.5">
											<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#58a6ff] opacity-75" />
											<span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#58a6ff]" />
										</span>
										<span className="text-[12px] text-[#58a6ff] font-mono">Running</span>
									</div>
								</MetadataRow>
							)}

							{/* Timestamps */}
							<MetadataRow label="Created">
								<span className="text-[12px] text-[#8b949e] font-mono">
									{formatDate(ticket.createdAt)}
								</span>
							</MetadataRow>

							<MetadataRow label="Updated">
								<span className="text-[12px] text-[#8b949e] font-mono">
									{formatDate(ticket.updatedAt)}
								</span>
							</MetadataRow>

							{/* Ticket ID */}
							<MetadataRow label="ID">
								<button
									onClick={copyId}
									className="text-[11px] text-[#6e7681] font-mono hover:text-[#e6edf3] transition-colors truncate max-w-full text-left"
									title="Click to copy"
								>
									{copied ? "Copied!" : ticket.id.slice(0, 12) + "..."}
								</button>
							</MetadataRow>

							{/* Tags preview */}
							{ticket.tags.length > 0 && (
								<MetadataRow label="Tags">
									<div className="flex flex-wrap gap-1">
										{ticket.tags.map((tag) => (
											<span
												key={tag}
												className="text-[11px] px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d]"
											>
												{tag}
											</span>
										))}
									</div>
								</MetadataRow>
							)}

							{/* Custom metadata */}
							{metadataEntries.length > 0 && (
								<>
									<div className="border-t border-[#21262d] pt-4">
										<span className="text-[10px] font-mono text-[#6e7681] uppercase tracking-wider">
											Metadata
										</span>
									</div>
									{metadataEntries.map(([key, value]) => (
										<MetadataRow key={key} label={key}>
											<span className="text-[12px] text-[#8b949e] font-mono break-all">
												{typeof value === "string" ? value : JSON.stringify(value)}
											</span>
										</MetadataRow>
									))}
								</>
							)}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function WorkflowOutputBlock({ nodeId, entry }: { nodeId: string; entry: WorkflowOutputEntry }) {
	const [expanded, setExpanded] = useState(true);
	const lines = entry.output.split("\n");
	const isLong = lines.length > 12;

	return (
		<div className="bg-[#161b22] border border-[#21262d] rounded-lg overflow-hidden">
			<button
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#21262d]/50 transition-colors"
			>
				<span className="text-[11px] font-mono text-[#8b949e]">
					{expanded ? "▾" : "▸"} {nodeId.slice(0, 8)}
				</span>
				<span className="text-[10px] text-[#6e7681] font-mono">
					{formatDate(entry.completedAt)}
				</span>
			</button>
			{expanded && (
				<div className="px-3 pb-3">
					<pre className="text-[12px] text-[#e6edf3] font-mono whitespace-pre-wrap break-words leading-relaxed max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-transparent">
						{entry.output || "(no output)"}
					</pre>
				</div>
			)}
		</div>
	);
}

function MetadataRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div>
			<span className="text-[10px] font-mono text-[#6e7681] uppercase tracking-wider block mb-1">
				{label}
			</span>
			{children}
		</div>
	);
}

function formatDate(iso: string): string {
	const d = new Date(iso);
	return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
