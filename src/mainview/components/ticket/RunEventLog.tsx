import { useEffect, useRef, useState } from "react";
import type { RunEvent } from "../../../shared/types";

interface RunEventLogProps {
	events: RunEvent[];
	isActive: boolean;
}

export function RunEventLog({ events, isActive }: RunEventLogProps) {
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
		<div className="relative">
			{/* Active indicator */}
			{isActive && (
				<div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
					<span className="relative flex h-1.5 w-1.5">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
						<span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-400" />
					</span>
					<span className="text-[9px] font-mono text-violet-400/70 uppercase tracking-widest">
						live
					</span>
				</div>
			)}

			<div
				ref={scrollRef}
				onScroll={handleScroll}
				className="max-h-80 overflow-y-auto bg-zinc-950 border border-zinc-800/60 rounded-lg p-3 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
			>
				{events.length === 0 ? (
					<div className="text-[11px] font-mono text-zinc-700 italic">
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
	const prefix = <span className="text-zinc-700 select-none mr-2">{time}</span>;

	switch (event.type) {
		case "AGENT_OUTPUT":
			return <AgentOutputLine prefix={prefix} payload={event.payload} />;

		case "AGENT_STARTED":
			return (
				<div className="text-[11px] font-mono leading-relaxed">
					{prefix}
					<span className="text-violet-400">&#9654; Agent started</span>
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

		case "NODE_STARTED":
		case "NODE_COMPLETED":
			return (
				<div className="text-[11px] font-mono leading-relaxed flex items-center gap-1.5">
					{prefix}
					<span className="inline-flex items-center rounded px-1 py-px bg-zinc-800/80 text-zinc-500 text-[10px]">
						{event.type === "NODE_STARTED" ? "started" : "completed"}
					</span>
					<span className="text-zinc-600">
						{(event.payload as any)?.nodeId ?? ""}
					</span>
				</div>
			);

		case "NODE_LOG":
			return (
				<div className="text-[11px] font-mono leading-relaxed">
					{prefix}
					<span className="text-zinc-400">
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
					<span className="text-zinc-500 italic">Run resumed</span>
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
					<span className="text-zinc-600">{event.type}</span>
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
								<span className="text-violet-400/90">{describeToolUse(block.name, block.input)}</span>
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
					<span className="text-zinc-300">{texts}</span>
				</div>
			);
		}

		case "tool_use": {
			const summary = describeToolUse(data.name, data.input);
			return (
				<div className="text-[11px] font-mono leading-relaxed">
					{prefix}
					<span className="text-violet-400/90">{summary}</span>
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
			return (
				<div className="text-[11px] font-mono leading-relaxed">
					{prefix}
					<span className="text-emerald-400">{texts}</span>
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
				className="cursor-pointer hover:bg-zinc-900/50 rounded -mx-1 px-1 transition-colors"
				onClick={() => setOpen(!open)}
			>
				{prefix}
				<span className="text-zinc-600 select-none mr-1">{open ? "▾" : "▸"}</span>
				<span className="text-zinc-500">
					{open ? "output" : preview ? `${preview}${content.length > 80 ? "…" : ""}` : "output"}
				</span>
			</div>
			{open && (
				<pre className="mt-0.5 ml-[4.5rem] text-[10px] text-zinc-600 whitespace-pre-wrap break-all max-h-32 overflow-y-auto bg-zinc-900/30 rounded px-2 py-1 border border-zinc-800/40">
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
