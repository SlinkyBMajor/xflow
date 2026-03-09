import { useState, useEffect, useRef } from "react";
import { Copy, Check, ChevronsDownUp, ChevronsUpDown, Reply, X, Send, Maximize2, FileCode } from "lucide-react";
import type { Ticket, WorkflowOutputEntry, WorkflowOutputStatus, TicketComment } from "../../../shared/types";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { useConfirm } from "../../hooks/useConfirm";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Textarea } from "../ui/textarea";
import { TicketForm } from "./TicketForm";
import { TicketView } from "./TicketView";
import { RunEventLog } from "./RunEventLog";
import { WorktreeStatus } from "./WorktreeStatus";
import { useWorkflowRuns } from "../../hooks/useWorkflowRuns";
import { useRunEvents } from "../../hooks/useRunEvents";
import { useCopyFeedback } from "../../hooks/useCopyFeedback";
import { useTicketComments } from "../../hooks/useTicketComments";
import { rpc } from "../../rpc";

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
	const isNew = !ticket.body;
	const [editing, setEditing] = useState(isNew);
	const { copied: idCopied, copy: copyId } = useCopyFeedback();
	const { copied: metaCopied, copy: copyMeta } = useCopyFeedback();
	const { runs } = useWorkflowRuns(open ? ticket.id : null);
	const activeRun = runs.find((r) => r.status === "active");
	const worktreeRun = runs.find((r) => r.worktreePath || r.worktreeBranch || r.mergeResult);
	const { events } = useRunEvents(activeRun?.id ?? null);

	const { comments, addComment } = useTicketComments(open ? ticket.id : null);
	const [replyTo, setReplyTo] = useState<{ nodeId: string; label: string } | null>(null);
	const [commentText, setCommentText] = useState("");
	const composerRef = useRef<HTMLTextAreaElement>(null);

	const metadataEntries = Object.entries(ticket.metadata ?? {}).filter(([key]) => !key.startsWith("_"));
	const workflowOutput = (ticket.metadata?._workflowOutput ?? {}) as Record<string, WorkflowOutputEntry>;
	const outputEntries = Object.entries(workflowOutput);
	const [allCollapsed, setAllCollapsed] = useState(false);
	const [viewerOutput, setViewerOutput] = useState<{ label: string; content: string } | null>(null);
	const confirm = useConfirm();

	const handleSubmitComment = async () => {
		const body = commentText.trim();
		if (!body) return;
		await addComment(body, replyTo?.nodeId, replyTo?.label);
		setCommentText("");
		setReplyTo(null);
	};

	// Reset editing state when ticket changes
	useEffect(() => {
		setEditing(!ticket.body);
	}, [ticket.id]);

	return (
		<>
		<Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
			<DialogContent className="w-[calc(100vw-12rem)] max-w-none h-[calc(100vh-9rem)] overflow-hidden p-0">
				<DialogTitle className="sr-only">Edit Ticket</DialogTitle>
				<DialogDescription className="sr-only">
					Edit ticket details
				</DialogDescription>

				<div className="flex min-h-[360px] h-full">
					{/* Left pane — editing + sticky composer */}
					<div className="flex-1 flex flex-col min-w-0">
						<div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-transparent">
							<div className="flex items-start justify-between mb-5">
								<span className="text-[10px] font-mono text-[#6e7681] uppercase tracking-wider">
									Ticket
								</span>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={async () => {
										const ok = await confirm({
											title: "Delete ticket",
											description: `This will permanently delete "${ticket.title}". This action cannot be undone.`,
											confirmLabel: "Delete",
											variant: "danger",
										});
										if (ok) onDelete();
									}}
									className="text-[11px] text-[#6e7681] hover:text-red-400 hover:bg-red-900/20 h-auto px-2 py-1"
								>
									Delete
								</Button>
							</div>

							{editing || isNew ? (
								<TicketForm
									initialTitle={ticket.title}
									initialBody={ticket.body || ""}
									initialTags={ticket.tags}
									onSave={(updates) => {
										onSave(updates);
										setEditing(false);
									}}
									onCancel={isNew ? onClose : () => setEditing(false)}
								/>
							) : (
								<TicketView
									title={ticket.title}
									body={ticket.body || ""}
									tags={ticket.tags}
									onEdit={() => setEditing(true)}
								/>
							)}

							{/* Workflow Output & Feedback Timeline */}
							{(outputEntries.length > 0 || comments.length > 0) && (
								<div className="mt-6 pt-4 border-t border-[#21262d]">
									<div className="flex items-center justify-between mb-3">
										<span className="text-[10px] font-mono text-[#6e7681] uppercase tracking-wider">
											{outputEntries.length > 0 ? "Workflow Output & Feedback" : "Feedback"}
										</span>
										{outputEntries.length > 0 && (
											<Tooltip>
												<TooltipTrigger asChild>
													<button
														onClick={() => setAllCollapsed((c) => !c)}
														className="text-[#6e7681] hover:text-[#e6edf3] transition-colors p-0.5"
													>
														{allCollapsed ? <ChevronsUpDown size={12} /> : <ChevronsDownUp size={12} />}
													</button>
												</TooltipTrigger>
												<TooltipContent>{allCollapsed ? "Expand all" : "Collapse all"}</TooltipContent>
											</Tooltip>
										)}
									</div>
									<div className="space-y-3">
										{buildTimeline(outputEntries, comments).map((item) =>
											item.kind === "output" ? (
												<div key={`output-${item.nodeId}`} className="relative group">
													<WorkflowOutputBlock
														nodeId={item.nodeId}
														entry={item.entry}
														allCollapsed={allCollapsed}
														onOpenViewer={() => setViewerOutput({
															label: item.entry.label ?? item.nodeId.slice(0, 8),
															content: item.entry.output || "(no output)",
														})}
														onOpenInEditor={() => rpc.request.openInEditor({
															content: item.entry.output || "",
															label: item.entry.label ?? item.nodeId.slice(0, 8),
														})}
													/>
													<button
														onClick={() => setReplyTo({ nodeId: item.nodeId, label: item.entry.label ?? item.nodeId.slice(0, 8) })}
														className="absolute top-2 right-[4.5rem] opacity-0 group-hover:opacity-100 transition-opacity text-[#6e7681] hover:text-[#58a6ff] hover:bg-[#21262d] p-1 rounded"
													>
														<Reply size={12} />
													</button>
												</div>
											) : (
												<CommentBlock key={`comment-${item.comment.id}`} comment={item.comment} />
											),
										)}
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

						{/* Sticky comment composer */}
						<div className="border-t border-[#21262d] px-6 py-3.5 shrink-0 bg-[#0d1117]/60">
							{replyTo && (
								<div className="flex items-center gap-1.5 mb-2">
									<span className="text-[10px] font-mono text-[#58a6ff] bg-[#58a6ff]/10 px-1.5 py-0.5 rounded">
										re: {replyTo.label}
									</span>
									<button onClick={() => setReplyTo(null)} className="text-[#6e7681] hover:text-[#e6edf3]">
										<X size={10} />
									</button>
								</div>
							)}
							<div className="flex gap-2">
								<Textarea
									ref={composerRef}
									value={commentText}
									onChange={(e) => setCommentText(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter" && e.metaKey) {
											e.preventDefault();
											handleSubmitComment();
										}
									}}
									placeholder="Comment..."
									className="text-sm min-h-[40px] max-h-[120px] bg-[#0d1117] border-[#30363d] resize-none flex-1"
									rows={2}
								/>
								<Button
									size="sm"
									onClick={handleSubmitComment}
									disabled={!commentText.trim()}
									className="h-8 px-2 self-end bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border-0"
								>
									<Send size={14} />
								</Button>
							</div>
						</div>
					</div>

					{/* Right pane — worktree + metadata */}
					<div className="w-96 flex-shrink-0 border-l border-[#21262d] bg-[#0d1117]/80 px-5 py-5 overflow-y-auto scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-transparent">
						{/* Worktree controls */}
						{worktreeRun && (
							<div className="mb-5">
								<span className="text-[10px] font-mono text-[#6e7681] uppercase tracking-wider block mb-3">
									Worktree
								</span>
								<WorktreeStatus run={worktreeRun} />
							</div>
						)}

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
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											onClick={() => copyId(ticket.id)}
											className="text-[11px] text-[#6e7681] font-mono hover:text-[#e6edf3] transition-colors truncate max-w-full text-left"
										>
											{idCopied ? "Copied!" : ticket.id.slice(0, 12) + "..."}
										</button>
									</TooltipTrigger>
									<TooltipContent>Copy ticket ID</TooltipContent>
								</Tooltip>
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
										<Tooltip>
											<TooltipTrigger asChild>
												<button
													onClick={() => copyMeta(formatMetadataForClipboard(metadataEntries))}
													className="text-[#6e7681] hover:text-[#e6edf3] transition-colors p-0.5"
												>
													{metaCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
												</button>
											</TooltipTrigger>
											<TooltipContent>Copy all metadata</TooltipContent>
										</Tooltip>
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

		{/* Output viewer modal */}
		<OutputViewerModal
			open={!!viewerOutput}
			label={viewerOutput?.label ?? ""}
			content={viewerOutput?.content ?? ""}
			onClose={() => setViewerOutput(null)}
		/>

		</>
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

function WorkflowOutputBlock({ nodeId, entry, allCollapsed, onOpenViewer, onOpenInEditor }: {
	nodeId: string;
	entry: WorkflowOutputEntry;
	allCollapsed: boolean;
	onOpenViewer: () => void;
	onOpenInEditor: () => void;
}) {
	const [expanded, setExpanded] = useState(true);

	useEffect(() => {
		setExpanded(!allCollapsed);
	}, [allCollapsed]);
	const status = deriveOutputStatus(entry);
	const style = STATUS_STYLES[status];

	// Strip redundant [Error] prefix when status already indicates error
	const displayOutput = (status === "error" || status === "timeout") && entry.output.startsWith("[Error] ")
		? entry.output.slice(8)
		: entry.output;

	return (
		<div className={`bg-[#161b22] border border-[#21262d] border-l-2 ${style.border} rounded-lg overflow-hidden ${style.bg}`}>
			<div className="flex items-center justify-between px-3 py-2">
				<button
					onClick={() => setExpanded(!expanded)}
					className="flex items-center gap-1.5 hover:bg-[#21262d]/50 transition-colors flex-1 text-left"
				>
					<span className="text-[11px] font-mono text-[#8b949e] flex items-center gap-1.5">
						<span className={status === "error" || status === "timeout" ? "text-red-400" : status === "partial" ? "text-amber-400" : status === "success" ? "text-emerald-400" : "text-[#6e7681]"}>
							{style.icon}
						</span>
						{expanded ? "\u25BE" : "\u25B8"} {entry.label ?? nodeId.slice(0, 8)}
					</span>
				</button>
				<div className="flex items-center gap-1">
					<span className="text-[10px] text-[#6e7681] font-mono mr-1">
						{formatDate(entry.completedAt)}
					</span>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={(e) => { e.stopPropagation(); onOpenViewer(); }}
								className="opacity-0 group-hover:opacity-100 transition-all text-[#6e7681] hover:text-[#e6edf3] hover:bg-[#21262d] p-1 rounded"
							>
								<Maximize2 size={12} />
							</button>
						</TooltipTrigger>
						<TooltipContent>Open in viewer</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={(e) => { e.stopPropagation(); onOpenInEditor(); }}
								className="opacity-0 group-hover:opacity-100 transition-all text-[#6e7681] hover:text-[#e6edf3] hover:bg-[#21262d] p-1 rounded"
							>
								<FileCode size={12} />
							</button>
						</TooltipTrigger>
						<TooltipContent>Open in editor</TooltipContent>
					</Tooltip>
				</div>
			</div>
			{expanded && (
				<div className="px-3 pb-3">
					<pre className={`text-[12px] font-mono whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-transparent ${style.text}`}>
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

type TimelineItem =
	| { kind: "output"; nodeId: string; entry: WorkflowOutputEntry; timestamp: string }
	| { kind: "comment"; comment: TicketComment; timestamp: string };

function buildTimeline(
	outputEntries: [string, WorkflowOutputEntry][],
	comments: TicketComment[],
): TimelineItem[] {
	const items: TimelineItem[] = [];
	for (const [nodeId, entry] of outputEntries) {
		items.push({ kind: "output", nodeId, entry, timestamp: entry.completedAt });
	}
	for (const comment of comments) {
		items.push({ kind: "comment", comment, timestamp: comment.createdAt });
	}
	items.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
	return items;
}

function OutputViewerModal({ open, label, content, onClose }: { open: boolean; label: string; content: string; onClose: () => void }) {
	return (
		<Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
			<DialogContent className="w-[calc(100vw-12rem)] max-w-none h-[calc(100vh-12rem)] overflow-hidden flex flex-col p-0">
				<div className="flex items-center justify-between px-5 py-3 border-b border-[#21262d] shrink-0 bg-[#161b22]">
					<div className="flex items-center gap-2.5">
						<FileCode size={14} className="text-[#6e7681]" />
						<DialogTitle className="text-[13px] font-mono font-medium text-[#e6edf3]">{label}</DialogTitle>
					</div>
					<DialogDescription className="sr-only">Full output viewer</DialogDescription>
					<button onClick={onClose} className="text-[#6e7681] hover:text-[#e6edf3] hover:bg-[#21262d] transition-all p-1.5 rounded">
						<X size={14} />
					</button>
				</div>
				<div className="flex-1 overflow-y-auto p-5 bg-[#0d1117] scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-transparent">
					<pre className="text-[12px] font-mono text-[#e6edf3] whitespace-pre-wrap break-words leading-relaxed">
						{content}
					</pre>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function CommentBlock({ comment }: { comment: TicketComment }) {
	return (
		<div className="bg-[#161b22] border border-[#21262d] border-l-2 border-l-[#58a6ff] rounded-lg px-3 py-2">
			<div className="flex items-center justify-between mb-1">
				<span className="text-[11px] font-mono text-[#58a6ff]/70 flex items-center gap-1.5">
					Feedback
					{comment.refLabel && (
						<span className="text-[10px] text-[#8b949e]">
							re: {comment.refLabel}
						</span>
					)}
				</span>
				<span className="text-[10px] text-[#6e7681] font-mono">
					{formatDate(comment.createdAt)}
				</span>
			</div>
			<p className="text-[12px] text-[#e6edf3] whitespace-pre-wrap leading-relaxed">
				{comment.body}
			</p>
		</div>
	);
}
