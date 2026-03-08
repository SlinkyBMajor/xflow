import { useState } from "react";
import { Copy, Check } from "lucide-react";
import type { Ticket, WorkflowOutputEntry, WorkflowOutputStatus } from "../../../shared/types";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { TicketForm } from "./TicketForm";
import { RunEventLog } from "./RunEventLog";
import { WorktreeStatus } from "./WorktreeStatus";
import { useWorkflowRuns } from "../../hooks/useWorkflowRuns";
import { useRunEvents } from "../../hooks/useRunEvents";
import { useCopyFeedback } from "../../hooks/useCopyFeedback";

interface TicketDetailModalProps {
	open: boolean;
	ticket: Ticket;
	laneName: string;
	laneColor: string | null;
	onClose: () => void;
	onSave: (updates: { title?: string; body?: string; tags?: string[] }) => void;
	onDelete: () => void;
}

export function TicketDetailModal({ open, ticket, laneName, laneColor, onClose, onSave, onDelete }: TicketDetailModalProps) {
	const { copied: idCopied, copy: copyId } = useCopyFeedback();
	const { copied: metaCopied, copy: copyMeta } = useCopyFeedback();
	const { runs } = useWorkflowRuns(open ? ticket.id : null);
	const activeRun = runs.find((r) => r.status === "active");
	const worktreeRun = runs.find((r) => r.worktreePath || r.worktreeBranch);
	const { events } = useRunEvents(activeRun?.id ?? null);

	const metadataEntries = Object.entries(ticket.metadata ?? {}).filter(([key]) => !key.startsWith("_"));
	const workflowOutput = (ticket.metadata?._workflowOutput ?? {}) as Record<string, WorkflowOutputEntry>;
	const outputEntries = Object.entries(workflowOutput);

	return (
		<Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
			<DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden">
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

						<div className="mt-4 space-y-3">
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

							{/* Worktree status for runs with worktree info */}
							{worktreeRun && (
								<div className="border-t border-[#21262d] pt-3">
									<WorktreeStatus run={worktreeRun} />
								</div>
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
									onClick={() => copyId(ticket.id)}
									className="text-[11px] text-[#6e7681] font-mono hover:text-[#e6edf3] transition-colors truncate max-w-full text-left"
									title="Click to copy"
								>
									{idCopied ? "Copied!" : ticket.id.slice(0, 12) + "..."}
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
									<div className="border-t border-[#21262d] pt-3 flex items-center justify-between">
										<span className="text-[10px] font-mono text-[#6e7681] uppercase tracking-wider">
											Metadata
										</span>
										<button
											onClick={() => copyMeta(formatMetadataForClipboard(metadataEntries))}
											className="text-[#6e7681] hover:text-[#e6edf3] transition-colors p-0.5"
											title="Copy all metadata"
										>
											{metaCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
										</button>
									</div>
									<div className="space-y-1">
										{metadataEntries.map(([key, value]) => (
											<div key={key} className="flex items-baseline justify-between gap-2 py-0.5">
												<span className="text-[10px] font-mono text-[#6e7681] uppercase tracking-wider shrink-0">
													{key}
												</span>
												<span className="text-[12px] text-[#8b949e] font-mono break-all text-right">
													{typeof value === "string" ? value : JSON.stringify(value)}
												</span>
											</div>
										))}
									</div>
								</>
							)}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function deriveOutputStatus(entry: WorkflowOutputEntry): WorkflowOutputStatus | "empty" {
	if (entry.status) return entry.status;
	if (!entry.output) return "empty";
	if (entry.output.startsWith("[Error]")) return "error";
	return "success";
}

const STATUS_STYLES: Record<WorkflowOutputStatus | "empty", {
	border: string;
	text: string;
	bg: string;
	icon: string;
	label: string;
}> = {
	success: { border: "border-l-emerald-600", text: "text-[#e6edf3]", bg: "", icon: "\u2713", label: "Success" },
	error:   { border: "border-l-red-600", text: "text-red-300", bg: "bg-red-900/10", icon: "\u2717", label: "Error" },
	timeout: { border: "border-l-red-600", text: "text-red-300", bg: "bg-red-900/10", icon: "\u2717", label: "Timeout" },
	partial: { border: "border-l-amber-600", text: "text-amber-200", bg: "bg-amber-900/10", icon: "\u26A0", label: "Partial" },
	empty:   { border: "border-l-[#30363d]", text: "text-[#6e7681]", bg: "", icon: "\u2014", label: "No output" },
};

function WorkflowOutputBlock({ nodeId, entry }: { nodeId: string; entry: WorkflowOutputEntry }) {
	const [expanded, setExpanded] = useState(true);
	const status = deriveOutputStatus(entry);
	const style = STATUS_STYLES[status];

	// Strip redundant [Error] prefix when status already indicates error
	const displayOutput = (status === "error" || status === "timeout") && entry.output.startsWith("[Error] ")
		? entry.output.slice(8)
		: entry.output;

	return (
		<div className={`bg-[#161b22] border border-[#21262d] border-l-2 ${style.border} rounded-lg overflow-hidden ${style.bg}`}>
			<button
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#21262d]/50 transition-colors"
			>
				<span className="text-[11px] font-mono text-[#8b949e] flex items-center gap-1.5">
					<span className={status === "error" || status === "timeout" ? "text-red-400" : status === "partial" ? "text-amber-400" : status === "success" ? "text-emerald-400" : "text-[#6e7681]"}>
						{style.icon}
					</span>
					{expanded ? "\u25BE" : "\u25B8"} {nodeId.slice(0, 8)}
				</span>
				<span className="text-[10px] text-[#6e7681] font-mono">
					{formatDate(entry.completedAt)}
				</span>
			</button>
			{expanded && (
				<div className="px-3 pb-3">
					<pre className={`text-[12px] font-mono whitespace-pre-wrap break-words leading-relaxed max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-transparent ${style.text}`}>
						{displayOutput || "(no output)"}
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

function formatMetadataForClipboard(entries: [string, unknown][]): string {
	return entries.map(([key, value]) => {
		const display = typeof value === "string" ? value : JSON.stringify(value);
		return `${key}: ${display}`;
	}).join("\n");
}
