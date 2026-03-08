import { useState } from "react";
import type { InterruptedRunInfo } from "../../../shared/types";

interface InterruptedRunsBannerProps {
	interruptedRuns: InterruptedRunInfo[];
	onRetry: (runId: string) => void;
	onAbort: (runId: string) => void;
}

function formatTimestamp(iso: string): string {
	const d = new Date(iso);
	const now = new Date();
	const diffMs = now.getTime() - d.getTime();
	const diffMin = Math.floor(diffMs / 60000);
	if (diffMin < 1) return "just now";
	if (diffMin < 60) return `${diffMin}m ago`;
	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) return `${diffHr}h ago`;
	const diffDay = Math.floor(diffHr / 24);
	return `${diffDay}d ago`;
}

export function InterruptedRunsBanner({
	interruptedRuns,
	onRetry,
	onAbort,
}: InterruptedRunsBannerProps) {
	const [collapsed, setCollapsed] = useState(false);
	const [acting, setActing] = useState<Set<string>>(new Set());

	if (interruptedRuns.length === 0) return null;

	const handleAction = (runId: string, action: (id: string) => void) => {
		setActing((prev) => new Set(prev).add(runId));
		action(runId);
	};

	return (
		<div className="flex-shrink-0 border-b border-[#21262d]/60">
			{/* Header bar */}
			<button
				onClick={() => setCollapsed((c) => !c)}
				className="w-full flex items-center gap-2.5 px-5 py-2 bg-[#161b22]/70 border-l-2 border-l-[#58a6ff] hover:bg-[#161b22] transition-colors"
			>
				{/* Warning pulse dot */}
				<div className="relative flex-shrink-0">
					<div className="w-2 h-2 rounded-full bg-amber-400" />
					<div className="absolute inset-0 w-2 h-2 rounded-full bg-amber-400 animate-ping opacity-40" />
				</div>

				<span className="text-[11px] font-mono tracking-wide text-[#e6edf3]">
					{interruptedRuns.length} interrupted workflow run{interruptedRuns.length !== 1 ? "s" : ""}
				</span>

				<div className="flex-1" />

				<svg
					width="10"
					height="10"
					viewBox="0 0 10 10"
					fill="none"
					className={`text-[#8b949e] transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
				>
					<path
						d="M2.5 4L5 6.5L7.5 4"
						stroke="currentColor"
						strokeWidth="1.2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</button>

			{/* Run list */}
			{!collapsed && (
				<div className="bg-[#161b22]/40 border-l-2 border-l-[#58a6ff]/30">
					{interruptedRuns.map((info, i) => {
						const isActing = acting.has(info.run.id);
						return (
							<div
								key={info.run.id}
								className={`flex items-center gap-3 px-5 py-2 ${
									i < interruptedRuns.length - 1 ? "border-b border-[#21262d]/40" : ""
								}`}
							>
								{/* Status indicator */}
								<div className="w-1 h-1 rounded-full bg-[#484f58] flex-shrink-0" />

								{/* Run info */}
								<div className="flex-1 min-w-0 flex items-center gap-3">
									<span className="text-[12px] font-medium text-[#e6edf3] truncate max-w-[160px]">
										{info.ticketTitle}
									</span>
									<span className="text-[#484f58]">/</span>
									<span className="text-[11px] font-mono tracking-wide text-[#8b949e] truncate max-w-[120px]">
										{info.workflowName}
									</span>
									{info.interruptedNodeLabel && (
										<>
											<span className="text-[#484f58]">/</span>
											<span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#8b949e] bg-[#21262d]/60 border border-[#30363d]/30 rounded px-1.5 py-0.5">
												<svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-[#6e7681]">
													<rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="0.8" />
												</svg>
												{info.interruptedNodeLabel}
											</span>
										</>
									)}
								</div>

								{/* Timestamp */}
								<span className="text-[10px] font-mono text-[#6e7681] flex-shrink-0 tabular-nums">
									{formatTimestamp(info.run.startedAt)}
								</span>

								{/* Actions */}
								<div className="flex items-center gap-1.5 flex-shrink-0">
									<button
										onClick={(e) => {
											e.stopPropagation();
											handleAction(info.run.id, onRetry);
										}}
										disabled={isActing}
										className="text-[10px] font-mono tracking-wide px-2.5 py-1 rounded bg-[#58a6ff]/15 text-[#58a6ff] border border-[#58a6ff]/20 hover:bg-[#58a6ff]/25 hover:border-[#58a6ff]/35 transition-colors disabled:opacity-40"
									>
										Retry
									</button>
									<button
										onClick={(e) => {
											e.stopPropagation();
											handleAction(info.run.id, onAbort);
										}}
										disabled={isActing}
										className="text-[10px] font-mono tracking-wide px-2.5 py-1 rounded bg-[#21262d]/60 text-[#8b949e] border border-[#30363d]/30 hover:bg-red-900/20 hover:text-red-400 hover:border-red-800/30 transition-colors disabled:opacity-40"
									>
										Abort
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
