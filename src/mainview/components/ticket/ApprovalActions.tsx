import { useState } from "react";
import { rpc } from "../../rpc";
import { Button } from "../ui/button";

interface ApprovalActionsProps {
	runId: string;
	message?: string;
}

export function ApprovalActions({ runId, message }: ApprovalActionsProps) {
	const [acting, setActing] = useState(false);

	async function handleApprove() {
		setActing(true);
		try {
			await rpc.request.approveRun({ runId });
		} finally {
			setActing(false);
		}
	}

	async function handleReject() {
		setActing(true);
		try {
			await rpc.request.rejectRun({ runId });
		} finally {
			setActing(false);
		}
	}

	return (
		<div className="rounded-lg border border-amber-800/30 bg-amber-950/10 px-4 py-3">
			<div className="flex items-center gap-2 mb-2">
				<span className="relative flex h-1.5 w-1.5">
					<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
					<span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
				</span>
				<span className="text-[10px] font-mono text-amber-400/80 uppercase tracking-wider">
					Approval Required
				</span>
			</div>

			{message && (
				<p className="text-[12px] text-zinc-400 mb-3 leading-relaxed">
					{message}
				</p>
			)}

			<div className="flex items-center gap-2">
				<Button
					size="sm"
					disabled={acting}
					onClick={handleApprove}
					className="h-7 px-3 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white border-0"
				>
					Approve
				</Button>
				<Button
					variant="ghost"
					size="sm"
					disabled={acting}
					onClick={handleReject}
					className="h-7 px-3 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-900/20"
				>
					Reject
				</Button>
			</div>
		</div>
	);
}
