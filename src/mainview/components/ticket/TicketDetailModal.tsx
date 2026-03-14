import { useState, useEffect, useRef } from "react";
import { Copy, Check, ChevronsDownUp, ChevronsUpDown, Reply, X, Send, Maximize2, FileCode, Pencil, ChevronDown, ChevronRight, ScrollText } from "lucide-react";
import type { Ticket, WorkflowOutputEntry, WorkflowOutputStatus, TicketComment, EnrichedWorkflowRun, IRNodeType } from "../../../shared/types";
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
import { useEnrichedRuns } from "../../hooks/useEnrichedRuns";
import { useRunEvents } from "../../hooks/useRunEvents";
import { useCopyFeedback } from "../../hooks/useCopyFeedback";
import { useTicketComments } from "../../hooks/useTicketComments";
import { rpc } from "../../rpc";
import { MarkdownRenderer, looksLikeMarkdown } from "../shared/MarkdownRenderer";
import { normalizeWorkflowOutput } from "../../lib/normalize-workflow-output";
import { getRegistryItem } from "../../../shared/node-registry";

interface TicketDetailModalProps {
	open: boolean;
	ticket: Ticket;
	laneName: string;
	laneColor: string | null;
	onClose: () => void;
	onSave: (updates: { title?: string; body?: string; tags?: string[] }) => void;
	onDelete: () => void;
	onReset: () => void;
}

export function TicketDetailModal({ open, ticket, laneName, laneColor, onClose, onSave, onDelete, onReset }: TicketDetailModalProps) {
	const isNew = !ticket.body;
	const [editing, setEditing] = useState(isNew);
	const { copied: idCopied, copy: copyId } = useCopyFeedback();
	const { copied: metaCopied, copy: copyMeta } = useCopyFeedback();
	const { runs } = useWorkflowRuns(open ? ticket.id : null);
	const { enrichedRuns } = useEnrichedRuns(open ? ticket.id : null);
	const activeRun = runs.find((r) => r.status === "active");
	const worktreeRun = runs.find((r) => r.worktreePath || r.worktreeBranch || r.mergeResult);
	const { events: activeRunEvents } = useRunEvents(activeRun?.id ?? null);

	const { comments, addComment, editComment } = useTicketComments(open ? ticket.id : null);
	const [replyTo, setReplyTo] = useState<{ nodeId: string; label: string } | null>(null);
	const [commentText, setCommentText] = useState("");
	const composerRef = useRef<HTMLTextAreaElement>(null);

	const metadataEntries = Object.entries(ticket.metadata ?? {}).filter(([key]) => !key.startsWith("_"));
	const outputEntries = normalizeWorkflowOutput(ticket.metadata?._workflowOutput);
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

	// Build grouped timeline
	const timeline = buildGroupedTimeline(outputEntries, comments, enrichedRuns, activeRun?.id ?? null);
	const hasContent = outputEntries.length > 0 || comments.length > 0;

	return (
		<>
		<Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
			<DialogContent className="w-[calc(100vw-15rem)] max-w-none h-[calc(100vh-9rem)] overflow-hidden p-0">
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
								<div className="flex gap-1">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={async () => {
											const ok = await confirm({
												title: "Reset ticket",
												description: `This will remove all outputs, comments, metadata, and tags from "${ticket.title}". Title and description will be kept.`,
												confirmLabel: "Reset",
												variant: "danger",
											});
											if (ok) onReset();
										}}
										className="text-[11px] text-[#6e7681] hover:text-amber-400 hover:bg-amber-900/20 h-auto px-2 py-1"
									>
										Reset
									</Button>
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
							{hasContent && (
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
										{timeline.map((item) => {
											if (item.kind === "comment") {
												return <CommentBlock key={`comment-${item.comment.id}`} comment={item.comment} onEdit={editComment} />;
											}
											if (item.kind === "ungrouped") {
												return (
													<UngroupedOutputs
														key="ungrouped"
														entries={item.entries}
														allCollapsed={allCollapsed}
														onOpenViewer={(entry) => setViewerOutput({
															label: entry.label ?? entry.nodeId.slice(0, 8),
															content: entry.output || "(no output)",
														})}
														onOpenInEditor={(entry) => rpc.request.openInEditor({
															content: entry.output || "",
															label: entry.label ?? entry.nodeId.slice(0, 8),
														})}
														onReply={(entry) => setReplyTo({ nodeId: entry.nodeId, label: entry.label ?? entry.nodeId.slice(0, 8) })}
													/>
												);
											}
											// item.kind === "runGroup"
											const isActive = item.enrichedRun.run.status === "active";
											return (
												<RunGroupCard
													key={`run-${item.enrichedRun.run.id}`}
													enrichedRun={item.enrichedRun}
													entries={item.entries}
													allCollapsed={allCollapsed}
													isActive={isActive}
													activeEvents={isActive ? activeRunEvents : undefined}
													onOpenViewer={(entry) => setViewerOutput({
														label: entry.label ?? entry.nodeId.slice(0, 8),
														content: entry.output || "(no output)",
													})}
													onOpenInEditor={(entry) => rpc.request.openInEditor({
														content: entry.output || "",
														label: entry.label ?? entry.nodeId.slice(0, 8),
													})}
													onReply={(entry) => setReplyTo({ nodeId: entry.nodeId, label: entry.label ?? entry.nodeId.slice(0, 8) })}
												/>
											);
										})}
									</div>
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

// ── Run Group Card ──

const RUN_STATUS_CONFIG: Record<string, { accent: string; label: string; textColor: string }> = {
	completed: { accent: "border-l-emerald-600", label: "Completed", textColor: "text-emerald-400" },
	error: { accent: "border-l-red-600", label: "Error", textColor: "text-red-400" },
	failed: { accent: "border-l-red-600", label: "Failed", textColor: "text-red-400" },
	active: { accent: "border-l-[#58a6ff]", label: "Running", textColor: "text-[#58a6ff]" },
	aborted: { accent: "border-l-amber-600", label: "Aborted", textColor: "text-amber-400" },
};

function formatDuration(startedAt: string, finishedAt: string | null): string {
	if (!finishedAt) return "";
	const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
	if (ms < 1000) return `${ms}ms`;
	const secs = Math.floor(ms / 1000);
	if (secs < 60) return `${secs}s`;
	const mins = Math.floor(secs / 60);
	const remSecs = secs % 60;
	return remSecs > 0 ? `${mins}m ${remSecs}s` : `${mins}m`;
}

function RunGroupCard({
	enrichedRun,
	entries,
	allCollapsed,
	isActive,
	activeEvents,
	onOpenViewer,
	onOpenInEditor,
	onReply,
}: {
	enrichedRun: EnrichedWorkflowRun;
	entries: WorkflowOutputEntry[];
	allCollapsed: boolean;
	isActive: boolean;
	activeEvents?: import("../../../shared/types").RunEvent[];
	onOpenViewer: (entry: WorkflowOutputEntry) => void;
	onOpenInEditor: (entry: WorkflowOutputEntry) => void;
	onReply: (entry: WorkflowOutputEntry) => void;
}) {
	const [logExpanded, setLogExpanded] = useState(false);
	const { run, workflowName, runNumber } = enrichedRun;
	const statusConfig = RUN_STATUS_CONFIG[run.status] ?? { accent: "border-l-[#30363d]", label: run.status, textColor: "text-[#8b949e]" };
	const duration = formatDuration(run.startedAt, run.finishedAt);

	return (
		<div className={`border border-[#21262d] border-l-2 ${statusConfig.accent} rounded-lg overflow-hidden bg-[#0d1117]/40`}>
			{/* Run header */}
			<div className="flex items-center justify-between px-3 py-2 bg-[#161b22]/80">
				<div className="flex items-center gap-2 min-w-0">
					<span className="text-[11px] font-mono text-[#e6edf3] truncate">{workflowName}</span>
					<span className="text-[10px] font-mono text-[#8b949e] bg-[#21262d] px-1.5 py-0.5 rounded shrink-0">
						#{runNumber}
					</span>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{duration && (
						<span className="text-[10px] font-mono text-[#6e7681]">{duration}</span>
					)}
					{isActive ? (
						<span className="flex items-center gap-1.5">
							<span className="relative flex h-1.5 w-1.5">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#58a6ff] opacity-75" />
								<span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#58a6ff]" />
							</span>
							<span className="text-[10px] font-mono text-[#58a6ff]">Running</span>
						</span>
					) : (
						<span className={`text-[10px] font-mono ${statusConfig.textColor}`}>{statusConfig.label}</span>
					)}
				</div>
			</div>

			{/* Output entries */}
			{entries.length > 0 && (
				<div className="px-2 py-2 space-y-2">
					{entries.map((entry, i) => (
						<WorkflowOutputBlock
							key={`${entry.nodeId}-${i}`}
							nodeId={entry.nodeId}
							entry={entry}
							allCollapsed={allCollapsed}
							onOpenViewer={() => onOpenViewer(entry)}
							onOpenInEditor={() => onOpenInEditor(entry)}
							onReply={() => onReply(entry)}
						/>
					))}
				</div>
			)}

			{/* Active run: live event log */}
			{isActive && activeEvents && (
				<div className="border-t border-[#21262d] px-3 py-2">
					<span className="text-[10px] font-mono text-[#6e7681] uppercase tracking-wider block mb-2">
						Live Activity
					</span>
					<RunEventLog events={activeEvents} isActive={true} />
				</div>
			)}

			{/* Completed run: toggle event log */}
			{!isActive && (
				<RunLogToggle runId={run.id} logExpanded={logExpanded} onToggle={() => setLogExpanded(!logExpanded)} />
			)}
		</div>
	);
}

function RunLogToggle({ runId, logExpanded, onToggle }: { runId: string; logExpanded: boolean; onToggle: () => void }) {
	const { events } = useRunEvents(logExpanded ? runId : null);

	return (
		<div className="border-t border-[#21262d]">
			<button
				onClick={onToggle}
				className="flex items-center gap-1.5 px-3 py-1.5 w-full text-left hover:bg-[#161b22]/60 transition-colors"
			>
				{logExpanded ? <ChevronDown size={10} className="text-[#6e7681]" /> : <ChevronRight size={10} className="text-[#6e7681]" />}
				<ScrollText size={10} className="text-[#6e7681]" />
				<span className="text-[10px] font-mono text-[#6e7681]">
					{logExpanded ? "Hide run log" : "View run log"}
				</span>
			</button>
			{logExpanded && events.length > 0 && (
				<div className="px-3 pb-2">
					<RunEventLog events={events} isActive={false} />
				</div>
			)}
		</div>
	);
}

// ── Ungrouped Outputs (old format fallback) ──

function UngroupedOutputs({
	entries,
	allCollapsed,
	onOpenViewer,
	onOpenInEditor,
	onReply,
}: {
	entries: WorkflowOutputEntry[];
	allCollapsed: boolean;
	onOpenViewer: (entry: WorkflowOutputEntry) => void;
	onOpenInEditor: (entry: WorkflowOutputEntry) => void;
	onReply: (entry: WorkflowOutputEntry) => void;
}) {
	return (
		<div className="border border-[#21262d] border-l-2 border-l-[#30363d] rounded-lg overflow-hidden bg-[#0d1117]/40">
			<div className="px-3 py-2 bg-[#161b22]/80">
				<span className="text-[11px] font-mono text-[#8b949e]">Previous Output</span>
			</div>
			<div className="px-2 py-2 space-y-2">
				{entries.map((entry, i) => (
					<WorkflowOutputBlock
						key={`ungrouped-${entry.nodeId}-${i}`}
						nodeId={entry.nodeId}
						entry={entry}
						allCollapsed={allCollapsed}
						onOpenViewer={() => onOpenViewer(entry)}
						onOpenInEditor={() => onOpenInEditor(entry)}
						onReply={() => onReply(entry)}
					/>
				))}
			</div>
		</div>
	);
}

// ── Output Block ──

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

function getNodeTypeLabel(nodeType?: IRNodeType): string | null {
	if (!nodeType) return null;
	const item = getRegistryItem(nodeType);
	return item?.label ?? null;
}

function WorkflowOutputBlock({ nodeId, entry, allCollapsed, onOpenViewer, onOpenInEditor, onReply }: {
	nodeId: string;
	entry: WorkflowOutputEntry;
	allCollapsed: boolean;
	onOpenViewer: () => void;
	onOpenInEditor: () => void;
	onReply?: () => void;
}) {
	const [expanded, setExpanded] = useState(true);

	useEffect(() => {
		setExpanded(!allCollapsed);
	}, [allCollapsed]);
	const status = deriveOutputStatus(entry);
	const style = STATUS_STYLES[status];
	const nodeTypeLabel = getNodeTypeLabel(entry.nodeType);

	// Strip redundant [Error] prefix when status already indicates error
	const displayOutput = (status === "error" || status === "timeout") && entry.output.startsWith("[Error] ")
		? entry.output.slice(8)
		: entry.output;

	return (
		<div className={`bg-[#161b22] border border-[#21262d] border-l-2 ${style.border} rounded-lg overflow-hidden ${style.bg} group`}>
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
						{nodeTypeLabel && (
							<span className="text-[10px] text-[#6e7681]">{nodeTypeLabel}</span>
						)}
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
					{onReply && (
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									onClick={(e) => { e.stopPropagation(); onReply(); }}
									className="opacity-0 group-hover:opacity-100 transition-all text-[#6e7681] hover:text-[#58a6ff] hover:bg-[#21262d] p-1 rounded"
								>
									<Reply size={12} />
								</button>
							</TooltipTrigger>
							<TooltipContent>Reply with feedback</TooltipContent>
						</Tooltip>
					)}
				</div>
			</div>
			{expanded && (
				<div className="px-3 pb-3 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-transparent">
					<pre className={`text-[12px] font-mono whitespace-pre-wrap break-words leading-relaxed ${style.text}`}>
						{displayOutput || "(no output)"}
					</pre>
				</div>
			)}
		</div>
	);
}

// ── Helpers ──

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

// ── Grouped Timeline ──

type GroupedTimelineItem =
	| { kind: "runGroup"; enrichedRun: EnrichedWorkflowRun; entries: WorkflowOutputEntry[]; timestamp: string }
	| { kind: "ungrouped"; entries: WorkflowOutputEntry[]; timestamp: string }
	| { kind: "comment"; comment: TicketComment; timestamp: string };

function buildGroupedTimeline(
	outputEntries: WorkflowOutputEntry[],
	comments: TicketComment[],
	enrichedRuns: EnrichedWorkflowRun[],
	activeRunId: string | null,
): GroupedTimelineItem[] {
	// Group outputs by runId
	const byRunId = new Map<string, WorkflowOutputEntry[]>();
	const ungrouped: WorkflowOutputEntry[] = [];

	for (const entry of outputEntries) {
		if (!entry.runId) {
			ungrouped.push(entry);
			continue;
		}
		const list = byRunId.get(entry.runId) ?? [];
		list.push(entry);
		byRunId.set(entry.runId, list);
	}

	// Build enriched run lookup
	const enrichedByRunId = new Map<string, EnrichedWorkflowRun>();
	for (const er of enrichedRuns) {
		enrichedByRunId.set(er.run.id, er);
	}

	const items: GroupedTimelineItem[] = [];

	// Add ungrouped outputs
	if (ungrouped.length > 0) {
		const earliest = ungrouped.reduce((min, e) => e.completedAt < min ? e.completedAt : min, ungrouped[0].completedAt);
		items.push({ kind: "ungrouped", entries: ungrouped, timestamp: earliest });
	}

	// Add run groups — include enriched runs even if they have no outputs yet (active runs)
	const processedRunIds = new Set<string>();

	for (const [runId, entries] of byRunId) {
		processedRunIds.add(runId);
		const enrichedRun = enrichedByRunId.get(runId);
		if (enrichedRun) {
			const timestamp = entries.reduce((min, e) => e.completedAt < min ? e.completedAt : min, entries[0].completedAt);
			items.push({ kind: "runGroup", enrichedRun, entries, timestamp });
		} else {
			// Outputs with a runId but no matching enriched run — treat as ungrouped
			ungrouped.push(...entries);
		}
	}

	// Add active run even if it has no outputs yet
	if (activeRunId && !processedRunIds.has(activeRunId)) {
		const enrichedRun = enrichedByRunId.get(activeRunId);
		if (enrichedRun) {
			items.push({ kind: "runGroup", enrichedRun, entries: [], timestamp: enrichedRun.run.startedAt });
		}
	}

	// Add comments
	for (const comment of comments) {
		items.push({ kind: "comment", comment, timestamp: comment.createdAt });
	}

	// Sort chronologically — active runs always last
	items.sort((a, b) => {
		const aActive = a.kind === "runGroup" && a.enrichedRun.run.status === "active";
		const bActive = b.kind === "runGroup" && b.enrichedRun.run.status === "active";
		if (aActive && !bActive) return 1;
		if (!aActive && bActive) return -1;
		return a.timestamp.localeCompare(b.timestamp);
	});

	return items;
}

// ── Output Viewer Modal ──

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
					{looksLikeMarkdown(content) ? (
						<MarkdownRenderer content={content} />
					) : (
						<pre className="text-[12px] font-mono text-[#e6edf3] whitespace-pre-wrap break-words leading-relaxed">
							{content}
						</pre>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

// ── Comment Block ──

function CommentBlock({ comment, onEdit }: { comment: TicketComment; onEdit: (id: string, body: string) => Promise<void> }) {
	const [editing, setEditing] = useState(false);
	const [editText, setEditText] = useState(comment.body);

	const handleSave = async () => {
		const trimmed = editText.trim();
		if (!trimmed || trimmed === comment.body) {
			setEditing(false);
			setEditText(comment.body);
			return;
		}
		await onEdit(comment.id, trimmed);
		setEditing(false);
	};

	return (
		<div className="bg-[#161b22] border border-[#21262d] border-l-2 border-l-[#58a6ff] rounded-lg px-3 py-2 group/comment">
			<div className="flex items-center justify-between mb-1">
				<span className="text-[11px] font-mono text-[#58a6ff]/70 flex items-center gap-1.5">
					Feedback
					{comment.refLabel && (
						<span className="text-[10px] text-[#8b949e]">
							re: {comment.refLabel}
						</span>
					)}
				</span>
				<div className="flex items-center gap-1.5">
					{comment.updatedAt && (
						<span className="text-[10px] text-[#6e7681] font-mono italic">edited</span>
					)}
					<span className="text-[10px] text-[#6e7681] font-mono">
						{formatDate(comment.createdAt)}
					</span>
					{!editing && (
						<button
							onClick={() => { setEditText(comment.body); setEditing(true); }}
							className="opacity-0 group-hover/comment:opacity-100 transition-opacity text-[#6e7681] hover:text-[#e6edf3] hover:bg-[#21262d] p-0.5 rounded"
						>
							<Pencil size={11} />
						</button>
					)}
				</div>
			</div>
			{editing ? (
				<div className="mt-1">
					<Textarea
						value={editText}
						onChange={(e) => setEditText(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && e.metaKey) { e.preventDefault(); handleSave(); }
							if (e.key === "Escape") { setEditing(false); setEditText(comment.body); }
						}}
						className="text-[12px] min-h-[40px] max-h-[120px] bg-[#0d1117] border-[#30363d] resize-none w-full"
						rows={2}
						autoFocus
					/>
					<div className="flex justify-end gap-1.5 mt-1.5">
						<Button
							size="sm"
							variant="ghost"
							onClick={() => { setEditing(false); setEditText(comment.body); }}
							className="h-6 px-2 text-[11px] text-[#8b949e] hover:text-[#e6edf3]"
						>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={handleSave}
							disabled={!editText.trim() || editText.trim() === comment.body}
							className="h-6 px-2 text-[11px] bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border-0"
						>
							Save
						</Button>
					</div>
				</div>
			) : (
				<p className="text-[12px] text-[#e6edf3] whitespace-pre-wrap leading-relaxed">
					{comment.body}
				</p>
			)}
		</div>
	);
}
