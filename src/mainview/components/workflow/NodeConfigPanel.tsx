import { useState } from "react";
import type { Node } from "@xyflow/react";
import type { IRNodeConfig, IRNodeType, Lane, ClaudeModel, AllowedToolsPreset, GitActionType, MergeMethod } from "../../../shared/types";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ExpandableTextarea } from "../ui/expandable-textarea";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { getNodeLabel } from "../../lib/workflow-ir";
import { Copy, Check, ChevronDown, ChevronRight, HelpCircle } from "lucide-react";

const SUPPORTS_INTERPOLATION = new Set<IRNodeType>([
	"claudeAgent",
	"customScript",
	"log",
	"setMetadata",
	"notify",
	"gitAction",
]);

const TEMPLATE_VARS = [
	{ token: "{{ticket.title}}", desc: "Ticket title" },
	{ token: "{{ticket.id}}", desc: "Ticket ID" },
	{ token: "{{ticket.laneId}}", desc: "Current lane ID" },
	{ token: "{{ticket.body}}", desc: "Ticket description" },
	{ token: "{{ticket.metadata.KEY}}", desc: "Ticket metadata value" },
	{ token: "{{outputs.NODE_ID}}", desc: "Output from a prior node" },
];

const CONDITION_SCOPE_VARS = [
	{ token: "ticket.title", desc: "Ticket title" },
	{ token: "ticket.id", desc: "Ticket ID" },
	{ token: "ticket.laneId", desc: "Current lane ID" },
	{ token: "ticket.body", desc: "Ticket description" },
	{ token: "ticket.metadata.KEY", desc: "Ticket metadata value" },
	{ token: 'outputs["node-id"]?.status', desc: '"success" | "error" | "timeout"' },
	{ token: 'outputs["node-id"]?.output', desc: "Raw output from a prior node" },
];

function VariableReference({ title, vars, defaultOpen = true }: { title: string; vars: { token: string; desc: string }[]; defaultOpen?: boolean }) {
	return (
		<ConfigSection title={title} defaultOpen={defaultOpen}>
			<div className="space-y-1.5">
				{vars.map((v) => (
					<div key={v.token} className="flex items-start gap-2">
						<code className="text-[10px] text-[#58a6ff] bg-[#0d1117] border border-[#30363d] rounded px-1 py-0.5 shrink-0 font-mono">{v.token}</code>
						<span className="text-[10px] text-[#8b949e] leading-relaxed">{v.desc}</span>
					</div>
				))}
			</div>
		</ConfigSection>
	);
}

const NODE_DESCRIPTIONS: Record<IRNodeType, string> = {
	start: "Entry point of the workflow",
	end: "Terminal node — ends the workflow run",
	claudeAgent: "Runs a Claude Code agent with a prompt",
	customScript: "Executes a shell or Bun script",
	notify: "Sends a desktop notification",
	waitForApproval: "Pauses the workflow until manually approved",
	moveToLane: "Moves the ticket to another lane",
	condition: "Branches based on a JavaScript expression",
	setMetadata: "Sets a key-value pair on the ticket",
	log: "Logs a message to the workflow output",
	gitAction: "Performs Git/GitHub operations (create PR, add reviewer, merge PR)",
};

interface NodeConfigPanelProps {
	node: Node;
	lanes: Lane[];
	onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
	onDelete: (nodeId: string) => void;
}

function NodeIdField({ id }: { id: string }) {
	const [copied, setCopied] = useState(false);
	const copyId = () => {
		navigator.clipboard.writeText(id);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};
	return (
		<div>
			<Label className="text-xs text-[#8b949e] mb-1">Node ID</Label>
			<div className="flex items-center gap-1">
				<code className="flex-1 text-xs text-[#8b949e] bg-[#0d1117] border border-[#30363d] rounded-md px-2 py-1.5 truncate select-all">
					{id}
				</code>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-[#8b949e] hover:text-[#e6edf3]" onClick={copyId}>
							{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
						</Button>
					</TooltipTrigger>
					<TooltipContent>{copied ? "Copied!" : "Copy node ID"}</TooltipContent>
				</Tooltip>
			</div>
		</div>
	);
}

export function NodeConfigPanel({ node, lanes, onUpdate, onDelete }: NodeConfigPanelProps) {
	const config = node.data.config as IRNodeConfig;
	const nodeType = node.type as IRNodeType;
	const isFlowNode = nodeType === "start" || nodeType === "end";

	const updateConfig = (updates: Record<string, unknown>) => {
		onUpdate(node.id, { ...node.data, config: { ...config, ...updates } });
	};

	const updateLabel = (label: string) => {
		onUpdate(node.id, { ...node.data, label });
	};

	return (
		<div className="w-64 bg-[#161b22]/50 border-l border-[#21262d] p-4 overflow-y-auto">
			<div className="flex items-center justify-between mb-4">
				<Tooltip>
					<TooltipTrigger asChild>
						<h3 className="text-[13px] font-semibold text-[#e6edf3] cursor-default">{getNodeLabel(nodeType)}</h3>
					</TooltipTrigger>
					<TooltipContent>{NODE_DESCRIPTIONS[nodeType]}</TooltipContent>
				</Tooltip>
			</div>

			<div className="space-y-3">
				<NodeIdField id={node.id} />
				<div>
					<Label htmlFor="node-label" className="text-xs text-[#8b949e] mb-1">Label</Label>
					<Input
						id="node-label"
						value={node.data.label as string || ""}
						onChange={(e) => updateLabel(e.target.value)}
						className="h-8 text-sm"
					/>
				</div>

				{renderConfigFields(config, updateConfig, lanes)}
				{SUPPORTS_INTERPOLATION.has(nodeType) && (
					<VariableReference title="Template Variables" vars={TEMPLATE_VARS} />
				)}
				{nodeType === "condition" && (
					<VariableReference title="Condition Scope" vars={CONDITION_SCOPE_VARS} />
				)}
			</div>

			{!isFlowNode && (
				<div className="mt-6 pt-4 border-t border-[#21262d]">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => onDelete(node.id)}
								className="w-full text-red-400 hover:text-red-300 hover:bg-red-950/30"
							>
								Delete Node
							</Button>
						</TooltipTrigger>
						<TooltipContent>Remove this node and disconnect its edges</TooltipContent>
					</Tooltip>
				</div>
			)}
		</div>
	);
}

function ConfigSection({ title, children, defaultOpen = false }: { title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<div className="border-t border-[#21262d] pt-2 -mx-0.5">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex items-center gap-1.5 w-full text-left text-xs font-medium text-[#8b949e] hover:text-[#e6edf3] transition-colors py-1"
			>
				{open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
				{title}
			</button>
			{open && <div className="space-y-3 pt-2">{children}</div>}
		</div>
	);
}

function TipLabel({ label, tip }: { label: string; tip: string }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Label className="text-xs text-[#8b949e] mb-1 cursor-default border-b border-dotted border-[#30363d]">{label}</Label>
			</TooltipTrigger>
			<TooltipContent side="left" className="max-w-[220px]">{tip}</TooltipContent>
		</Tooltip>
	);
}

function ClaudeAgentFields({ config, updateConfig }: {
	config: IRNodeConfig & { type: "claudeAgent" };
	updateConfig: (updates: Record<string, unknown>) => void;
}) {
	const skipPermissions = config.skipPermissions ?? true;

	return (
		<>
			{/* Always visible: core task fields */}
			<div>
				<TipLabel label="Prompt" tip="The task instructions sent to the agent. Supports {{ticket.title}}, {{ticket.body}}, and {{ticket.metadata.*}} interpolation." />
				<ExpandableTextarea
					label="Edit Prompt"
					value={config.prompt}
					onChange={(e) => updateConfig({ prompt: e.target.value })}
					className="text-sm min-h-[80px]"
					placeholder="Enter prompt for Claude..."
				/>
			</div>
			<div>
				<TipLabel label="Output Label" tip="Name for this node's output. Referenced in later nodes and visible in the run log." />
				<Input
					value={config.outputLabel ?? ""}
					onChange={(e) => updateConfig({ outputLabel: e.target.value || undefined })}
					className="h-8 text-sm"
					placeholder='e.g., "Plan", "Implementation"'
				/>
			</div>
			<div>
				<TipLabel label="Model" tip="Which Claude model to use. Opus is most capable, Haiku is fastest and cheapest, Sonnet balances both." />
				<select
					value={config.model ?? ""}
					onChange={(e) => updateConfig({ model: e.target.value || undefined })}
					className="w-full h-8 text-sm bg-[#0d1117] border border-[#30363d] rounded-md px-2 text-[#e6edf3]"
				>
					<option value="">Default</option>
					<option value="opus">Opus</option>
					<option value="sonnet">Sonnet</option>
					<option value="haiku">Haiku</option>
				</select>
			</div>

			{/* Agent section */}
			<ConfigSection title="Agent">
				<div>
					<TipLabel label="Max Turns" tip="Limit how many tool-use turns the agent can take. Caps cost and prevents runaway loops. Leave empty for unlimited." />
					<Input
						type="number"
						min={1}
						value={config.maxTurns ?? ""}
						onChange={(e) => {
							const val = parseInt(e.target.value);
							updateConfig({ maxTurns: val > 0 ? val : undefined });
						}}
						className="h-8 text-sm w-28"
						placeholder="Unlimited"
					/>
				</div>
				<div>
					<TipLabel label="System Prompt" tip="Appended to Claude's default system prompt. Use for persistent instructions like coding style, constraints, or persona. Supports {{ticket.*}} and {{outputs.NODE_ID}} interpolation." />
					<ExpandableTextarea
						label="Edit System Prompt"
						value={config.systemPrompt ?? ""}
						onChange={(e) => updateConfig({ systemPrompt: e.target.value || undefined })}
						className="text-sm min-h-[60px]"
						placeholder="Additional system instructions..."
					/>
				</div>
				<div>
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={config.includeWorkflowOutput ?? true}
							onChange={(e) => updateConfig({ includeWorkflowOutput: e.target.checked })}
							className="rounded border-[#30363d] bg-[#0d1117] text-[#58a6ff] focus:ring-[#58a6ff]/30 h-3.5 w-3.5"
						/>
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="text-xs text-[#8b949e] border-b border-dotted border-[#30363d] cursor-default">Include prior workflow output</span>
							</TooltipTrigger>
							<TooltipContent side="left" className="max-w-[220px]">Feed outputs from previous nodes and user comments into this agent's context.</TooltipContent>
						</Tooltip>
					</label>
				</div>
			</ConfigSection>

			{/* Permissions section */}
			<ConfigSection title={<span className="flex items-center gap-1">Permissions<Tooltip><TooltipTrigger asChild><HelpCircle className="h-3 w-3 text-[#484f58] hover:text-[#8b949e] transition-colors cursor-default" /></TooltipTrigger><TooltipContent side="right" className="max-w-[260px]">Skip permissions auto-approves tool use. Allowed tools restricts which tools are available. Use both together to auto-approve a restricted set (e.g. skip + plan-only).</TooltipContent></Tooltip></span>}>
				<div>
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={skipPermissions}
							onChange={(e) => updateConfig({ skipPermissions: e.target.checked })}
							className="rounded border-[#30363d] bg-[#0d1117] text-[#58a6ff] focus:ring-[#58a6ff]/30 h-3.5 w-3.5"
						/>
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="text-xs text-[#8b949e] border-b border-dotted border-[#30363d] cursor-default">Skip permission checks</span>
							</TooltipTrigger>
							<TooltipContent side="left" className="max-w-[220px]">Auto-approve all tool use without prompting. Can be combined with Allowed Tools to auto-approve a restricted set.</TooltipContent>
						</Tooltip>
					</label>
				</div>
				<div>
					<TipLabel label="Allowed Tools" tip="Restricts which tools the agent can use. Works with or without skip permissions — skip auto-approves, this controls which tools are available." />
					<select
						value={config.allowedToolsPreset ?? ""}
						onChange={(e) => updateConfig({ allowedToolsPreset: (e.target.value || undefined) as AllowedToolsPreset | undefined })}
						className="w-full h-8 text-sm bg-[#0d1117] border border-[#30363d] rounded-md px-2 text-[#e6edf3]"
					>
						<option value="">All tools (no restriction)</option>
						<option value="plan-only">Plan only (Read, Grep, Glob — no edits)</option>
						<option value="read-only">Read-only (Read, Grep, Glob)</option>
						<option value="edit">Edit (Read, Write, Edit, Grep, Glob)</option>
						<option value="full">Full (Read, Write, Edit, Bash, Grep, Glob, Agent)</option>
						<option value="custom">Custom</option>
					</select>
				</div>
				{config.allowedToolsPreset === "custom" && (
					<div>
						<TipLabel label="Custom Tools" tip="Comma-separated list of Claude Code tool names. Supports patterns like Bash(git:*) to allow only specific commands." />
						<Input
							value={config.allowedToolsCustom ?? ""}
							onChange={(e) => updateConfig({ allowedToolsCustom: e.target.value || undefined })}
							className="h-8 text-sm"
							placeholder="Read,Edit,Bash(git:*)"
						/>
					</div>
				)}
			</ConfigSection>

			{/* Execution section */}
			<ConfigSection title="Execution">
				<div>
					<TipLabel label="Timeout (seconds)" tip="Maximum wall-clock time before the agent process is killed. Different from max turns which limits reasoning depth." />
					<Input
						type="number"
						min={10}
						value={Math.round((config.timeoutMs ?? 600000) / 1000)}
						onChange={(e) => {
							const secs = parseInt(e.target.value);
							if (secs > 0) updateConfig({ timeoutMs: secs * 1000 });
						}}
						className="h-8 text-sm w-28"
					/>
				</div>
				<div>
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={config.worktreeEnabled ?? false}
							onChange={(e) => updateConfig({ worktreeEnabled: e.target.checked })}
							className="rounded border-[#30363d] bg-[#0d1117] text-[#58a6ff] focus:ring-[#58a6ff]/30 h-3.5 w-3.5"
						/>
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="text-xs text-[#8b949e] border-b border-dotted border-[#30363d] cursor-default">Use git worktree</span>
							</TooltipTrigger>
							<TooltipContent side="left" className="max-w-[220px]">Run the agent in an isolated git worktree. Use a downstream Git Action node to create a PR or merge.</TooltipContent>
						</Tooltip>
					</label>
				</div>
			</ConfigSection>
		</>
	);
}

function GitActionFields({ config, updateConfig }: {
	config: IRNodeConfig & { type: "gitAction" };
	updateConfig: (updates: Record<string, unknown>) => void;
}) {
	const action = config.action as GitActionType;

	return (
		<>
			<div>
				<TipLabel label="Action" tip="Which Git/GitHub operation to perform." />
				<select
					value={action}
					onChange={(e) => updateConfig({ action: e.target.value as GitActionType })}
					className="w-full h-8 text-sm bg-[#0d1117] border border-[#30363d] rounded-md px-2 text-[#e6edf3]"
				>
					<option value="createPr">Create Pull Request</option>
					<option value="addReviewer">Add Reviewer</option>
					<option value="mergePr">Merge Pull Request</option>
				</select>
			</div>

			{action === "createPr" && (
				<>
					<div>
						<TipLabel label="Base branch" tip="Target branch for the PR. Defaults to the currently checked out branch." />
						<Input
							value={config.baseBranch ?? ""}
							onChange={(e) => updateConfig({ baseBranch: e.target.value || undefined })}
							className="h-8 text-sm"
							placeholder="Defaults to current branch"
						/>
					</div>
					<div>
						<TipLabel label="PR Title" tip="Custom PR title. Defaults to the ticket title. Supports {{interpolation}}." />
						<Input
							value={config.prTitle ?? ""}
							onChange={(e) => updateConfig({ prTitle: e.target.value || undefined })}
							className="h-8 text-sm"
							placeholder="Defaults to ticket title"
						/>
					</div>
					<div>
						<TipLabel label="PR Body" tip="Custom PR body. Defaults to ticket description + commit log. Supports {{interpolation}}." />
						<ExpandableTextarea
							label="Edit PR Body"
							value={config.prBody ?? ""}
							onChange={(e) => updateConfig({ prBody: e.target.value || undefined })}
							className="text-sm min-h-[60px]"
							placeholder="Defaults to ticket body + commits"
						/>
					</div>
				</>
			)}

			{action === "addReviewer" && (
				<>
					<div>
						<TipLabel label="PR Number" tip="The PR to add the reviewer to. Defaults to ticket.metadata.prNumber if left empty." />
						<Input
							value={config.prNumber ?? ""}
							onChange={(e) => updateConfig({ prNumber: e.target.value || undefined })}
							className="h-8 text-sm"
							placeholder="Auto from ticket metadata"
						/>
					</div>
					<div>
						<TipLabel label="Reviewer" tip="GitHub username of the reviewer to add." />
						<Input
							value={config.reviewer ?? ""}
							onChange={(e) => updateConfig({ reviewer: e.target.value || undefined })}
							className="h-8 text-sm"
							placeholder="e.g., copilot"
						/>
					</div>
				</>
			)}

			{action === "mergePr" && (
				<>
					<div>
						<TipLabel label="PR Number" tip="The PR to merge. Defaults to ticket.metadata.prNumber if left empty." />
						<Input
							value={config.prNumber ?? ""}
							onChange={(e) => updateConfig({ prNumber: e.target.value || undefined })}
							className="h-8 text-sm"
							placeholder="Auto from ticket metadata"
						/>
					</div>
					<div>
						<TipLabel label="Merge Method" tip="How to merge the PR: squash combines all commits, merge creates a merge commit, rebase replays commits." />
						<select
							value={config.mergeMethod ?? "squash"}
							onChange={(e) => updateConfig({ mergeMethod: e.target.value as MergeMethod })}
							className="w-full h-8 text-sm bg-[#0d1117] border border-[#30363d] rounded-md px-2 text-[#e6edf3]"
						>
							<option value="squash">Squash</option>
							<option value="merge">Merge</option>
							<option value="rebase">Rebase</option>
						</select>
					</div>
				</>
			)}
		</>
	);
}

function renderConfigFields(
	config: IRNodeConfig,
	updateConfig: (updates: Record<string, unknown>) => void,
	lanes: Lane[],
) {
	switch (config.type) {
		case "claudeAgent":
			return <ClaudeAgentFields config={config} updateConfig={updateConfig} />;
		case "customScript":
			return (
				<>
					<div>
						<TipLabel label="Script" tip="The script to execute. Supports {{ticket.title}}, {{ticket.metadata.KEY}}, and {{outputs.NODE_ID}} interpolation." />
						<ExpandableTextarea
							label="Edit Script"
							mono
							value={config.script}
							onChange={(e) => updateConfig({ script: e.target.value })}
							className="text-sm min-h-[80px] font-mono"
							placeholder="Enter script..."
						/>
					</div>
					<div>
						<TipLabel label="Interpreter" tip="Runtime used to execute the script." />
						<select
							value={config.interpreter ?? "bun"}
							onChange={(e) => updateConfig({ interpreter: e.target.value })}
							className="w-full h-8 text-sm bg-[#0d1117] border border-[#30363d] rounded-md px-2 text-[#e6edf3]"
						>
							<option value="bun">Bun</option>
							<option value="sh">Shell</option>
						</select>
					</div>
					<div>
						<TipLabel label="Timeout (seconds)" tip="Maximum wall-clock time before the script is killed." />
						<Input
							type="number"
							min={5}
							value={Math.round((config.timeoutMs ?? 30000) / 1000)}
							onChange={(e) => {
								const secs = parseInt(e.target.value);
								if (secs > 0) updateConfig({ timeoutMs: secs * 1000 });
							}}
							className="h-8 text-sm w-28"
						/>
					</div>
				</>
			);
		case "notify":
			return (
				<>
					<div>
						<TipLabel label="Title" tip="Notification title. Supports {{ticket.*}} and {{outputs.NODE_ID}} interpolation." />
						<Input
							value={config.title}
							onChange={(e) => updateConfig({ title: e.target.value })}
							className="h-8 text-sm"
						/>
					</div>
					<div>
						<TipLabel label="Body" tip="Notification body. Supports {{ticket.*}} and {{outputs.NODE_ID}} interpolation." />
						<ExpandableTextarea
							label="Edit Notification Body"
							value={config.body}
							onChange={(e) => updateConfig({ body: e.target.value })}
							className="text-sm min-h-[60px]"
						/>
					</div>
				</>
			);
		case "waitForApproval":
			return (
				<div>
					<Label className="text-xs text-[#8b949e] mb-1">Message</Label>
					<ExpandableTextarea
						label="Edit Approval Message"
						value={config.message}
						onChange={(e) => updateConfig({ message: e.target.value })}
						className="text-sm min-h-[60px]"
						placeholder="Message shown to approver..."
					/>
				</div>
			);
		case "moveToLane":
			return (
				<div>
					<Label className="text-xs text-[#8b949e] mb-1">Target Lane</Label>
					<select
						value={config.laneId}
						onChange={(e) => {
							const lane = lanes.find((l) => l.id === e.target.value);
							updateConfig({ laneId: e.target.value, laneName: lane?.name ?? "" });
						}}
						className="w-full h-8 text-sm bg-[#0d1117] border border-[#30363d] rounded-md px-2 text-[#e6edf3]"
					>
						<option value="">Select lane...</option>
						{lanes.map((lane) => (
							<option key={lane.id} value={lane.id}>{lane.name}</option>
						))}
					</select>
				</div>
			);
		case "condition":
			return (
				<div>
					<TipLabel label="Expression" tip="JavaScript expression evaluated against the workflow scope. Access ticket fields and node outputs directly (no {{}} needed)." />
					<ExpandableTextarea
						label="Edit Condition Expression"
						mono
						value={config.expression}
						onChange={(e) => updateConfig({ expression: e.target.value })}
						className="text-sm min-h-[60px] font-mono"
						placeholder="ticket.metadata.status === 'ready'"
					/>
				</div>
			);
		case "setMetadata":
			return (
				<>
					<div>
						<TipLabel label="Key" tip="The metadata key to set on the ticket." />
						<Input
							value={config.key}
							onChange={(e) => updateConfig({ key: e.target.value })}
							className="h-8 text-sm font-mono"
						/>
					</div>
					<div>
						<TipLabel label="Value" tip="The value to store. Supports {{ticket.*}} and {{outputs.NODE_ID}} interpolation." />
						<Input
							value={config.value}
							onChange={(e) => updateConfig({ value: e.target.value })}
							className="h-8 text-sm"
						/>
					</div>
				</>
			);
		case "log":
			return (
				<div>
					<TipLabel label="Message" tip="The message to log. Supports {{ticket.*}} and {{outputs.NODE_ID}} interpolation." />
					<ExpandableTextarea
						label="Edit Log Message"
						value={config.message}
						onChange={(e) => updateConfig({ message: e.target.value })}
						className="text-sm min-h-[60px]"
						placeholder="Log message template..."
					/>
				</div>
			);
		case "gitAction":
			return <GitActionFields config={config} updateConfig={updateConfig} />;
		case "start":
		case "end":
			return <p className="text-xs text-[#8b949e]">No configuration needed.</p>;
	}
}
