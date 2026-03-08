import { useState, useEffect, useCallback } from "react";
import type { WorkflowRun, Ticket, RunEvent } from "../../../shared/types";
import { RunEventLog } from "../ticket/RunEventLog";
import { useRunEvents } from "../../hooks/useRunEvents";
import { onWorkflowRunUpdated } from "../../rpc";

interface AgentPanelProps {
	activeRuns: Map<string, WorkflowRun>;
	tickets: Ticket[];
}

interface TabInfo {
	run: WorkflowRun;
	ticketTitle: string;
}

function AgentTab({ run, isSelected, onClick, onClose }: {
	run: TabInfo;
	isSelected: boolean;
	onClick: () => void;
	onClose: (e: React.MouseEvent) => void;
}) {
	const isActive = run.run.status === "active";

	return (
		<button
			onClick={onClick}
			className={`group flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono border-b-2 transition-colors shrink-0 ${
				isSelected
					? "border-[#58a6ff] text-[#e6edf3] bg-[#161b22]/50"
					: "border-transparent text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]/30"
			}`}
		>
			{isActive && (
				<span className="relative flex h-1.5 w-1.5 shrink-0">
					<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#58a6ff] opacity-75" />
					<span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#58a6ff]" />
				</span>
			)}
			{!isActive && (
				<span className="h-1.5 w-1.5 rounded-full bg-[#484f58] shrink-0" />
			)}
			<span className="truncate max-w-[140px]">{run.ticketTitle}</span>
			<span
				onClick={onClose}
				className="ml-1 text-[#6e7681] hover:text-[#e6edf3] opacity-0 group-hover:opacity-100 transition-opacity"
			>
				&times;
			</span>
		</button>
	);
}

function AgentTabContent({ runId, isActive }: { runId: string; isActive: boolean }) {
	const { events } = useRunEvents(runId);

	return (
		<div className="flex-1 overflow-hidden">
			<RunEventLog events={events} isActive={isActive} fullHeight />
		</div>
	);
}

export function AgentPanel({ activeRuns, tickets }: AgentPanelProps) {
	const [open, setOpen] = useState(false);
	const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
	const [trackedRuns, setTrackedRuns] = useState<Map<string, WorkflowRun>>(new Map());

	const ticketMap = new Map(tickets.map((t) => [t.id, t]));

	// Track new active runs and keep completed ones until dismissed
	useEffect(() => {
		setTrackedRuns((prev) => {
			const next = new Map(prev);
			for (const [ticketId, run] of activeRuns) {
				next.set(run.id, run);
			}
			return next;
		});
	}, [activeRuns]);

	// Auto-open and select when a new run starts
	useEffect(() => {
		return onWorkflowRunUpdated((run) => {
			if (run.status === "active") {
				setTrackedRuns((prev) => {
					const next = new Map(prev);
					next.set(run.id, run);
					return next;
				});
				setSelectedRunId(run.id);
				setOpen(true);
			} else {
				// Update status of existing tracked run
				setTrackedRuns((prev) => {
					if (!prev.has(run.id)) return prev;
					const next = new Map(prev);
					next.set(run.id, run);
					return next;
				});
			}
		});
	}, []);

	// Keyboard shortcut: ⌘J to toggle
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "j") {
				e.preventDefault();
				setOpen((prev) => !prev);
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, []);

	const closeTab = useCallback((runId: string) => {
		setTrackedRuns((prev) => {
			const next = new Map(prev);
			next.delete(runId);
			return next;
		});
		setSelectedRunId((prev) => {
			if (prev !== runId) return prev;
			// Select another tab
			const remaining = [...trackedRuns.keys()].filter((id) => id !== runId);
			return remaining.length > 0 ? remaining[0] : null;
		});
	}, [trackedRuns]);

	const tabs: TabInfo[] = [...trackedRuns.values()].map((run) => ({
		run,
		ticketTitle: ticketMap.get(run.ticketId)?.title ?? run.ticketId.slice(0, 8),
	}));

	// Auto-select first tab if none selected
	const effectiveSelectedId = selectedRunId && trackedRuns.has(selectedRunId)
		? selectedRunId
		: tabs.length > 0 ? tabs[0].run.id : null;

	const hasActiveRuns = [...trackedRuns.values()].some((r) => r.status === "active");
	const tabCount = tabs.length;

	if (tabCount === 0 && !open) return null;

	return (
		<div className="flex flex-col border-t border-[#21262d] bg-[#0d1117]">
			{/* Header bar — always visible when there are tabs */}
			<button
				onClick={() => setOpen((prev) => !prev)}
				className="flex items-center gap-2 px-4 py-1.5 text-[10px] font-mono text-[#6e7681] uppercase tracking-wider hover:bg-[#161b22]/50 transition-colors cursor-pointer select-none"
			>
				<span className={`transition-transform ${open ? "" : "-rotate-90"}`}>
					&#9662;
				</span>
				<span>Agents</span>
				{tabCount > 0 && (
					<span className="text-[#6e7681]">({tabCount})</span>
				)}
				{hasActiveRuns && (
					<span className="relative flex h-1.5 w-1.5 ml-1">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#58a6ff] opacity-75" />
						<span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#58a6ff]" />
					</span>
				)}
				<span className="ml-auto text-[#484f58] text-[9px] normal-case tracking-normal">
					⌘J
				</span>
			</button>

			{/* Panel content */}
			{open && (
				<div className="flex flex-col h-[280px]">
					{tabCount === 0 ? (
						<div className="flex-1 flex items-center justify-center text-[11px] font-mono text-[#484f58] italic">
							No agent runs to display
						</div>
					) : (
						<>
							{/* Tab bar */}
							<div className="flex border-b border-[#21262d]/60 overflow-x-auto scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-transparent">
								{tabs.map((tab) => (
									<AgentTab
										key={tab.run.id}
										run={tab}
										isSelected={tab.run.id === effectiveSelectedId}
										onClick={() => setSelectedRunId(tab.run.id)}
										onClose={(e) => {
											e.stopPropagation();
											closeTab(tab.run.id);
										}}
									/>
								))}
							</div>

							{/* Event log for selected tab */}
							{effectiveSelectedId && (
								<AgentTabContent
									key={effectiveSelectedId}
									runId={effectiveSelectedId}
									isActive={trackedRuns.get(effectiveSelectedId)?.status === "active"}
								/>
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
}
