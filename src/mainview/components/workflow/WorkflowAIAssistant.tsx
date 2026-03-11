import { useState, useEffect, useCallback, useRef } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import type { WorkflowIR } from "../../../shared/types";
import { rpc, onWorkflowGenerationResult, onWorkflowGenerationEvent } from "../../rpc";

interface LogEntry {
	type: "text" | "tool_use" | "tool_result" | "status" | "error" | "success";
	content: string;
	timestamp: number;
}

interface WorkflowAIAssistantProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	hasExistingNodes: boolean;
	existingIR?: WorkflowIR;
	onApply: (ir: WorkflowIR, mode: "replace" | "add") => void;
}

export function WorkflowAIAssistant({
	open,
	onOpenChange,
	hasExistingNodes,
	existingIR,
	onApply,
}: WorkflowAIAssistantProps) {
	const [prompt, setPrompt] = useState("");
	const [mode, setMode] = useState<"replace" | "add">(hasExistingNodes ? "add" : "replace");
	const [loading, setLoading] = useState(false);
	const [log, setLog] = useState<LogEntry[]>([]);
	const logEndRef = useRef<HTMLDivElement>(null);

	// Auto-scroll log
	useEffect(() => {
		logEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [log]);

	// Listen for streaming events
	useEffect(() => {
		return onWorkflowGenerationEvent((event) => {
			setLog((prev) => [...prev, { ...event, timestamp: Date.now() }]);
		});
	}, []);

	// Listen for final result
	useEffect(() => {
		return onWorkflowGenerationResult((data) => {
			setLoading(false);
			if (data.error) {
				setLog((prev) => [...prev, { type: "error", content: data.error!, timestamp: Date.now() }]);
			} else if (data.ir) {
				const nodeCount = data.ir.nodes.length;
				const edgeCount = data.ir.edges.length;
				setLog((prev) => [...prev, {
					type: "success",
					content: `Generated ${nodeCount} nodes, ${edgeCount} edges`,
					timestamp: Date.now(),
				}]);
				onApply(data.ir, data.mode);
			}
		});
	}, [onApply]);

	const handleGenerate = useCallback(() => {
		if (!prompt.trim()) return;
		setLoading(true);
		setLog([{ type: "status", content: "Sending request...", timestamp: Date.now() }]);

		rpc.request.generateWorkflowFromPrompt({
			prompt: prompt.trim(),
			existingIR: mode === "add" ? existingIR : undefined,
			mode,
		});
	}, [prompt, mode, existingIR]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-xl p-0 overflow-hidden">
				<DialogHeader className="px-5 pt-5 pb-3 border-b border-[#21262d]">
					<DialogTitle>AI Workflow Assistant</DialogTitle>
					<DialogDescription>
						Describe the workflow you want and AI will generate it.
					</DialogDescription>
				</DialogHeader>
				<div className="px-5 py-4 space-y-4">
					<textarea
						autoFocus
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !loading) {
								e.preventDefault();
								handleGenerate();
							}
						}}
						placeholder='e.g. "Add a Claude agent to review code, then a condition to check if it passed, with approval on failure"'
						className="w-full h-24 bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-[#e6edf3] placeholder:text-[#484f58] resize-none outline-none focus:border-[#58a6ff] transition-colors"
						disabled={loading}
					/>

					{hasExistingNodes && (
						<div className="flex items-center gap-3">
							<span className="text-xs text-[#8b949e]">Mode:</span>
							<div className="flex rounded-md border border-[#30363d] overflow-hidden">
								<button
									onClick={() => setMode("replace")}
									className={`px-3 py-1 text-xs transition-colors ${
										mode === "replace"
											? "bg-[#21262d] text-[#e6edf3]"
											: "text-[#8b949e] hover:text-[#e6edf3]"
									}`}
								>
									Replace
								</button>
								<button
									onClick={() => setMode("add")}
									className={`px-3 py-1 text-xs border-l border-[#30363d] transition-colors ${
										mode === "add"
											? "bg-[#21262d] text-[#e6edf3]"
											: "text-[#8b949e] hover:text-[#e6edf3]"
									}`}
								>
									Add to workflow
								</button>
							</div>
						</div>
					)}

					{/* Output log */}
					{log.length > 0 && (
						<div className="bg-[#0d1117] border border-[#21262d] rounded-md max-h-48 overflow-y-auto font-mono text-[11px]">
							<div className="p-2 space-y-0.5">
								{log.map((entry, i) => (
									<div key={i} className="flex gap-2">
										<span className="flex-shrink-0 select-none">
											{entry.type === "text" && <span className="text-[#8b949e]">{">"}</span>}
											{entry.type === "tool_use" && <span className="text-[#58a6ff]">{"$"}</span>}
											{entry.type === "tool_result" && <span className="text-[#8b949e]">{"<"}</span>}
											{entry.type === "status" && <span className="text-[#6e7681]">{"#"}</span>}
											{entry.type === "error" && <span className="text-red-400">{"!"}</span>}
											{entry.type === "success" && <span className="text-green-400">{"✓"}</span>}
										</span>
										<span
											className={`break-all ${
												entry.type === "error"
													? "text-red-400"
													: entry.type === "success"
														? "text-green-400"
														: entry.type === "status"
															? "text-[#6e7681]"
															: entry.type === "tool_use"
																? "text-[#58a6ff]"
																: "text-[#8b949e]"
											}`}
										>
											{entry.content}
										</span>
									</div>
								))}
								{loading && (
									<div className="flex gap-2 items-center">
										<span className="w-2 h-2 border border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
										<span className="text-[#6e7681]">Waiting for response...</span>
									</div>
								)}
								<div ref={logEndRef} />
							</div>
						</div>
					)}

					<div className="flex items-center justify-between">
						<span className="text-[10px] text-[#484f58]">
							{loading ? "" : "⌘↵ to generate"}
						</span>
						<Button
							onClick={handleGenerate}
							disabled={!prompt.trim() || loading}
							className="bg-[#238636] hover:bg-[#2ea043] text-white"
						>
							{loading ? "Generating..." : "Generate"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
