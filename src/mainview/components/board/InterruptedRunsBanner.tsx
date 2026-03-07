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
		<div className="flex-shrink-0 border-b border-zinc-800/60">
			{/* Header bar */}
			<button
				onClick={() => setCollapsed((c) => !c)}
				className="w-full flex items-center gap-2.5 px-5 py-2 bg-zinc-900/70 border-l-2 border-l-violet-500 hover:bg-zinc-900 transition-colors"
			>
				{/* Warning pulse dot */}
				<div className="relative flex-shrink-0">
					<div className="w-2 h-2 rounded-full bg-amber-400" />
					<div className="absolute inset-0 w-2 h-2 rounded-full bg-amber-400 animate-ping opacity-40" />
				</div>

				<span className="text-[11px] font-mono tracking-wide text-zinc-300">
					{interruptedRuns.length} interrupted workflow run{interruptedRuns.length !== 1 ? "s" : ""}
				</span>

				<div className="flex-1" />

				<svg
					width="10"
					height="10"
					viewBox="0 0 10 10"
					fill="none"
					className={`text-zinc-500 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
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
				<div className="bg-zinc-900/40 border-l-2 border-l-violet-500/30">
					{interruptedRuns.map((info, i) => {
						const isActing = acting.has(info.run.id);
						return (
							<div
								key={info.run.id}
								className={`flex items-center gap-3 px-5 py-2 ${
									i < interruptedRuns.length - 1 ? "border-b border-zinc-800/40" : ""
								}`}
							>
								{/* Status indicator */}
								<div className="w-1 h-1 rounded-full bg-zinc-600 flex-shrink-0" />

								{/* Run info */}
								<div className="flex-1 min-w-0 flex items-center gap-3">
									<span className="text-[12px] font-medium text-zinc-300 truncate max-w-[160px]">
										{info.ticketTitle}
									</span>
									<span className="text-zinc-700">/</span>
									<span className="text-[11px] font-mono tracking-wide text-zinc-500 truncate max-w-[120px]">
										{info.workflowName}
									</span>
									{info.interruptedNodeLabel && (
										<>
											<span className="text-zinc-700">/</span>
											<span className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-500 bg-zinc-800/60 border border-zinc-700/30 rounded px-1.5 py-0.5">
												<svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-zinc-600">
													<rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="0.8" />
												</svg>
												{info.interruptedNodeLabel}
											</span>
										</>
									)}
								</div>

								{/* Timestamp */}
								<span className="text-[10px] font-mono text-zinc-600 flex-shrink-0 tabular-nums">
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
										className="text-[10px] font-mono tracking-wide px-2.5 py-1 rounded bg-violet-500/15 text-violet-400 border border-violet-500/20 hover:bg-violet-500/25 hover:border-violet-500/35 transition-colors disabled:opacity-40"
									>
										Retry
									</button>
									<button
										onClick={(e) => {
											e.stopPropagation();
											handleAction(info.run.id, onAbort);
										}}
										disabled={isActing}
										className="text-[10px] font-mono tracking-wide px-2.5 py-1 rounded bg-zinc-800/60 text-zinc-500 border border-zinc-700/30 hover:bg-red-900/20 hover:text-red-400 hover:border-red-800/30 transition-colors disabled:opacity-40"
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
