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
	const [copied, setCopied] = useState(false);

	const metadataEntries = Object.entries(ticket.metadata ?? {});

	const copyId = () => {
		navigator.clipboard.writeText(ticket.id);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	return (
		<Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
			<DialogContent className="max-w-4xl">
				<DialogTitle className="sr-only">Edit Ticket</DialogTitle>
				<DialogDescription className="sr-only">
					Edit ticket details
				</DialogDescription>

				<div className="flex min-h-[360px]">
					{/* Left pane — editing */}
					<div className="flex-1 p-5 min-w-0">
						<div className="flex items-start justify-between mb-5">
							<span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
								Ticket
							</span>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={onDelete}
								className="text-[11px] text-zinc-600 hover:text-red-400 hover:bg-red-900/20 h-auto px-2 py-1"
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
					</div>

					{/* Right pane — metadata */}
					<div className="w-64 flex-shrink-0 border-l border-zinc-800 bg-zinc-900/30 p-5 overflow-y-auto">
						<span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
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
									<span className="text-[13px] text-zinc-300">{laneName}</span>
								</div>
							</MetadataRow>

							{/* Timestamps */}
							<MetadataRow label="Created">
								<span className="text-[12px] text-zinc-400 font-mono">
									{formatDate(ticket.createdAt)}
								</span>
							</MetadataRow>

							<MetadataRow label="Updated">
								<span className="text-[12px] text-zinc-400 font-mono">
									{formatDate(ticket.updatedAt)}
								</span>
							</MetadataRow>

							{/* Ticket ID */}
							<MetadataRow label="ID">
								<button
									onClick={copyId}
									className="text-[11px] text-zinc-500 font-mono hover:text-zinc-300 transition-colors truncate max-w-full text-left"
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
												className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50"
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
									<div className="border-t border-zinc-800/60 pt-4">
										<span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
											Metadata
										</span>
									</div>
									{metadataEntries.map(([key, value]) => (
										<MetadataRow key={key} label={key}>
											<span className="text-[12px] text-zinc-400 font-mono break-all">
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

function MetadataRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div>
			<span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider block mb-1">
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
