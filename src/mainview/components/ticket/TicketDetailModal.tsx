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
	onClose: () => void;
	onSave: (updates: { title?: string; body?: string; tags?: string[] }) => void;
	onDelete: () => void;
}

export function TicketDetailModal({ open, ticket, onClose, onSave, onDelete }: TicketDetailModalProps) {
	return (
		<Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
			<DialogContent className="max-w-xl">
				<div className="p-5">
					<DialogTitle className="sr-only">Edit Ticket</DialogTitle>
					<DialogDescription className="sr-only">
						Edit ticket details
					</DialogDescription>

					<div className="flex items-start justify-between mb-5">
						<div>
							<span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
								Ticket
							</span>
						</div>
						<Button
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

					<div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center gap-4">
						<span className="text-[10px] text-zinc-700 font-mono">
							created {new Date(ticket.createdAt).toLocaleDateString()}
						</span>
						<span className="text-[10px] text-zinc-700 font-mono">
							updated {new Date(ticket.updatedAt).toLocaleDateString()}
						</span>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
