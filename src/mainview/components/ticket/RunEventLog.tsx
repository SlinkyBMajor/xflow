import { useEffect, useRef, useState } from "react";
import type { RunEvent } from "../../../shared/types";

interface RunEventLogProps {
	events: RunEvent[];
	isActive: boolean;
	fullHeight?: boolean;
}

export function RunEventLog({ events, isActive, fullHeight }: RunEventLogProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const shouldAutoScroll = useRef(true);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el || !shouldAutoScroll.current) return;
		el.scrollTop = el.scrollHeight;
	}, [events.length]);

	function handleScroll() {
		const el = scrollRef.current;
		if (!el) return;
		const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
		shouldAutoScroll.current = atBottom;
	}

	if (events.length === 0 && !isActive) return null;

	return (
		<div className={`relative ${fullHeight ? "flex flex-col flex-1 min-h-0" : ""}`}>
			{/* Active indicator */}
			{isActive && (
				<div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
					<span className="relative flex h-1.5 w-1.5">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#58a6ff] opacity-75" />
						<span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#58a6ff]" />
					</span>
					<span className="text-[9px] font-mono text-[#58a6ff]/70 uppercase tracking-widest">
						live
					</span>
				</div>
			)}

			<div
				ref={scrollRef}
				onScroll={handleScroll}
				className={`overflow-y-auto bg-[#0d1117] p-3 pb-6 select-text scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-transparent ${
				fullHeight ? "flex-1 min-h-0" : "max-h-80 border border-[#21262d] rounded-lg"
			}`}
			>
				{events.length === 0 ? (
					<div className="text-[11px] font-mono text-[#484f58] italic">
						Waiting for events...
					</div>
				) : (
					<div className="space-y-0.5">
						{events.map((event) => (
							<EventLine key={event.id} event={event} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function EventLine({ event }: { event: RunEvent }) {
	const time = formatTime(event.timestamp);
	const prefix = <span className="text-[#484f58] select-none mr-2">{time}</span>;

	switch (event.type) {
		case "AGENT_OUTPUT":
			return <AgentOutputLine prefix={prefix} payload={event.payload} />;

		case "AGENT_STARTED":
			return (
				<div className="text-[11px] font-mono leading-relaxed">
					{prefix}
					<span className="text-[#58a6ff]">&#9654; Agent started</span>
				</div>
			);

		case "AGENT_COMPLETED":
			return (
				<div className="text-[11px] font-mono leading-relaxed">
					{prefix}
					<span className="text-emerald-400">&#10003; Agent completed</span>
				</div>
			);

		case "AGENT_TIMEOUT":
			return (
				<div className="text-[11px] font-mono leading-relaxed">
					{prefix}
					<span className="text-red-400">&#10005; Agent timed out</span>
				</div>
			);

		case "SCRIPT_STARTED":
			return (
				<div className="text-[11px] font-mono leading-relaxed">
					{prefix}
					<span className="text-[#58a6ff]">&#9654; Script started</span>
					<span className="text-[#6e7681] ml-1.5">({(event.payload as any)?.interpreter ?? "sh"})</span>
				</div>
			);

		case "SCRIPT_OUTPUT": {
			const chunk = (event.payload as any)?.chunk;
			if (!chunk) return null;
			return (
				<div className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all">
					{prefix}
					<span className="text-[#e6edf3]">{chunk}</span>
				</div>
			);
		}

		case "SCRIPT_STDERR": {
			const chunk = (event.payload as any)?.chunk;
			if (!chunk) return null;
			return (
				<div className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all">
					{prefix}
					<span className="text-amber-400">{chunk}</span>
				</div>
			);
		}

		case "SCRIPT_ERROR":
			return (
				<div className="text-[11px] font-mono leading-relaxed">
					{prefix}
					<span className="text-red-400">
						&#10005; Script failed (exit code {(event.payload as any)?.exitCode ?? "?"})
					</span>
					{(event.payload as any)?.stderr && (
						<pre className="mt-1 ml-[4.5rem] text-[10px] text-red-400/80 whitespace-pre-wrap break-all max-h-40 overflow-y-auto bg-red-400/5 rounded px-2 py-1 border border-red-400/10">
							{(event.payload as any).stderr}
						</pre>
					)}
				</div>
			);

		case "SCRIPT_TIMEOUT":
			return (
				<div className="text-[11px] font-mono leading-relaxed">
					{prefix}
					<span className="text-red-400">&#10005; Script timed out after {(event.payload as any)?.timeoutMs ?? "?"}ms</span>
				</div>
			);

		case "SCRIPT_COMPLETED":
			return (
				<div className="text-[11px] font-mono leading-relaxed">
					{prefix}
					<span className="text-emerald-400">&#10003; Script completed</span>
				</div>
			);

		case "NODE_STARTED":
		case "NODE_COMPLETED":
			return (
				<div className="text-[11px] font-mono leading-relaxed flex items-center gap-1.5">
					{prefix}
					<span className="inline-flex items-center rounded px-1 py-px bg-[#21262d]/80 text-[#8b949e] text-[10px]">
						{event.type === "NODE_STARTED" ? "started" : "completed"}
					</span>
					<span className="text-[#6e7681]">
						{(event.payload as any)?.nodeId ?? ""}
					</span>
				</div>
			);

		case "NODE_ERROR":
			return (
				<div className="text-[11px] font-mono leading-relaxed">
					{prefix}
					<span className="text-red-400">
						&#10005; {(event.payload as any)?.message ?? (event.payload as any)?.error ?? "Node error"}
					</span>
				</div>
			);

		case "NODE_LOG":
			return (
				<div className="text-[11px] font-mono leading-relaxed">
					{prefix}
					<span className="text-[#8b949e]">
						{(event.payload as any)?.message ?? ""}
					</span>
				</div>
			);

		case "NODE_NOTIFY":
			return (
				<div className="text-[11px] font-mono leading-relaxed">
					{prefix}
					<span className="text-amber-400">
						&#9888; {(event.payload as any)?.title}
						{(event.payload as any)?.body ? ` — ${(event.payload as any).body}` : ""}
					</span>
				</div>
			);

		case "RUN_RESUMED":
			return (
				<div className="text-[11px] font-mono leading-relaxed">
					{prefix}
					<span className="text-[#8b949e] italic">Run resumed</span>
				</div>
			);

		case "RUN_ABORTED":
			return (
				<div className="text-[11px] font-mono leading-relaxed">
					{prefix}
					<span className="text-red-400/80 italic">Run aborted</span>
				</div>
			);

		default:
			return (
				<div className="text-[11px] font-mono leading-relaxed">
					{prefix}
					<span className="text-[#6e7681]">{event.type}</span>
				</div>
			);
	}
}

function AgentOutputLine({ prefix, payload }: { prefix: React.ReactNode; payload: unknown }) {
	const data = payload as Record<string, any> | null;
	if (!data || !data.type) return null;

	switch (data.type) {
		case "assistant": {
			// Claude CLI stream-json: content is in data.message.content
			const content = data.message?.content ?? data.content;
			if (!content) return null;
			// Check for tool_use blocks
			if (Array.isArray(content)) {
				for (const block of content) {
					if (block.type === "tool_use") {
						return (
							<div className="text-[11px] font-mono leading-relaxed">
								{prefix}
								<span className="text-[#58a6ff]/90">{describeToolUse(block.name, block.input)}</span>
							</div>
						);
					}
				}
			}
			const texts = extractTextContent(content);
			if (!texts) return null;
			return (
				<div className="text-[11px] font-mono leading-relaxed">
					{prefix}
					<span className="text-[#e6edf3]">{texts}</span>
				</div>
			);
		}

		case "tool_use": {
			const summary = describeToolUse(data.name, data.input);
			return (
				<div className="text-[11px] font-mono leading-relaxed">
					{prefix}
					<span className="text-[#58a6ff]/90">{summary}</span>
				</div>
			);
		}

		case "tool_result":
		case "user": {
			return <CollapsibleToolResult prefix={prefix} data={data} />;
		}

		case "result": {
			// Claude CLI stream-json: result text is in data.result (string)
			const resultText = typeof data.result === "string" ? data.result : null;
			const contentText = extractTextContent(data.content);
			const texts = resultText || contentText;
			if (!texts) return null;
			const isError = data.is_error === true;
			return (
				<div className="text-[11px] font-mono leading-relaxed">
					{prefix}
					<span className={isError ? "text-red-400" : "text-emerald-400"}>
						{isError ? "\u2717 " : ""}{texts}
					</span>
				</div>
			);
		}

		default:
			return null;
	}
}

function CollapsibleToolResult({ prefix, data }: { prefix: React.ReactNode; data: Record<string, any> }) {
	const [open, setOpen] = useState(false);
	// Handle both direct tool_result and Claude CLI user message wrapping
	const rawContent = data.message?.content ?? data.content;
	const content = extractTextContent(rawContent) ?? extractToolResultContent(rawContent) ?? JSON.stringify(data.output ?? rawContent ?? "", null, 2);
	const preview = typeof content === "string" ? content.slice(0, 80) : "";

	return (
		<div className="text-[11px] font-mono leading-relaxed">
			<div
				className="cursor-pointer hover:bg-[#161b22]/50 rounded -mx-1 px-1 transition-colors"
				onClick={() => setOpen(!open)}
			>
				{prefix}
				<span className="text-[#6e7681] select-none mr-1">{open ? "▾" : "▸"}</span>
				<span className="text-[#8b949e]">
					{open ? "output" : preview ? `${preview}${content.length > 80 ? "…" : ""}` : "output"}
				</span>
			</div>
			{open && (
				<pre className="mt-0.5 ml-[4.5rem] text-[10px] text-[#6e7681] whitespace-pre-wrap break-all max-h-32 overflow-y-auto bg-[#161b22]/30 rounded px-2 py-1 border border-[#21262d]">
					{content}
				</pre>
			)}
		</div>
	);
}

function extractTextContent(content: unknown): string | null {
	if (!Array.isArray(content)) return null;
	const texts: string[] = [];
	for (const block of content) {
		if (block?.type === "text" && typeof block.text === "string") {
			texts.push(block.text);
		}
	}
	return texts.length > 0 ? texts.join("") : null;
}

function extractToolResultContent(content: unknown): string | null {
	if (!Array.isArray(content)) return null;
	for (const block of content) {
		if (block?.type === "tool_result" && typeof block.content === "string") {
			return block.content.slice(0, 200);
		}
	}
	return null;
}

function describeToolUse(name?: string, input?: Record<string, any>): string {
	if (!name) return "Using tool";
	switch (name) {
		case "Read":
			return `Reading ${input?.file_path ?? "file"}`;
		case "Edit":
			return `Editing ${input?.file_path ?? "file"}`;
		case "Write":
			return `Writing ${input?.file_path ?? "file"}`;
		case "Bash":
			return `Running bash command`;
		case "Grep":
			return `Searching for "${input?.pattern ?? "..."}"`;
		case "Glob":
			return `Finding files matching ${input?.pattern ?? "..."}`;
		default:
			return `${name}`;
	}
}

function formatTime(timestamp: string): string {
	try {
		const d = new Date(timestamp);
		return d.toLocaleTimeString("en-US", {
			hour12: false,
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	} catch {
		return "--:--:--";
	}
}
