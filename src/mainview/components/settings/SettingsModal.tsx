import { useState, useCallback, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
	GitBranch,
	Terminal,
	CheckCircle2,
	XCircle,
	Loader2,
	RefreshCw,
	Cpu,
	Github,
	ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { rpc } from "../../rpc";
import type { BoardSettings, MergeStrategy, CliToolCheck } from "../../../shared/types";

// ── Types ──

type SettingsSection = "board" | "cli-tools";

interface SettingsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	settings: BoardSettings | null | undefined;
	onSave: (settings: BoardSettings) => void;
}

// ── Tool definitions ──

const CLI_TOOLS = [
	{ id: "claude", name: "Claude Code", description: "AI coding assistant CLI", hasAuth: true },
	{ id: "gh", name: "GitHub CLI", description: "GitHub from the command line", hasAuth: true },
	{ id: "git", name: "Git", description: "Version control", hasAuth: false },
	{ id: "bun", name: "Bun", description: "JavaScript runtime & toolkit", hasAuth: false },
] as const;

// ── Component ──

export function SettingsModal({ open, onOpenChange, settings, onSave }: SettingsModalProps) {
	const [activeSection, setActiveSection] = useState<SettingsSection>("board");

	// Board settings state
	const [worktreeEnabled, setWorktreeEnabled] = useState(settings?.defaultWorktreeEnabled ?? false);
	const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>(settings?.defaultMergeStrategy ?? "manual");
	const [baseBranch, setBaseBranch] = useState(settings?.defaultBaseBranch ?? "");

	// CLI tools state
	const [toolChecks, setToolChecks] = useState<Record<string, CliToolCheck | "checking">>({});

	// Sync settings when modal opens
	useEffect(() => {
		if (open) {
			setWorktreeEnabled(settings?.defaultWorktreeEnabled ?? false);
			setMergeStrategy(settings?.defaultMergeStrategy ?? "manual");
			setBaseBranch(settings?.defaultBaseBranch ?? "");
		}
	}, [open, settings]);

	const handleSave = () => {
		onSave({
			defaultWorktreeEnabled: worktreeEnabled,
			defaultMergeStrategy: mergeStrategy,
			defaultBaseBranch: baseBranch || undefined,
		});
		toast.success("Settings saved");
		onOpenChange(false);
	};

	const checkTool = useCallback(async (toolId: string) => {
		setToolChecks((prev) => ({ ...prev, [toolId]: "checking" }));
		try {
			const result = await rpc.request.checkCliTool({ tool: toolId });
			setToolChecks((prev) => ({ ...prev, [toolId]: result }));
		} catch (err) {
			setToolChecks((prev) => ({
				...prev,
				[toolId]: {
					tool: toolId,
					installed: false,
					version: null,
					authenticated: null,
					authDetails: null,
					error: String(err),
				},
			}));
			toast.error(`Failed to check ${toolId}`);
		}
	}, []);

	const checkAllTools = useCallback(async () => {
		for (const tool of CLI_TOOLS) {
			checkTool(tool.id);
		}
	}, [checkTool]);

	const sections: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
		{
			id: "board",
			label: "Board",
			icon: <GitBranch size={14} />,
		},
		{
			id: "cli-tools",
			label: "CLI Tools",
			icon: <Terminal size={14} />,
		},
	];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl w-[70vw] h-[80vh] max-h-[80vh] p-0 overflow-hidden flex flex-col">
				<DialogTitle className="sr-only">Settings</DialogTitle>
				<DialogDescription className="sr-only">
					Configure application settings
				</DialogDescription>

				{/* Header */}
				<div className="flex items-center h-12 px-5 border-b border-[#21262d] flex-shrink-0">
					<h2 className="text-sm font-semibold text-[#e6edf3]" style={{ fontFamily: "var(--font-display)" }}>
						Settings
					</h2>
				</div>

				{/* Body: sidebar + content */}
				<div className="flex flex-1 min-h-0">
					{/* Sidebar */}
					<nav className="w-48 flex-shrink-0 border-r border-[#21262d] py-2 px-2">
						{sections.map((section) => (
							<button
								key={section.id}
								onClick={() => setActiveSection(section.id)}
								className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] font-medium transition-colors ${
									activeSection === section.id
										? "bg-[#21262d] text-[#e6edf3]"
										: "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#161b22]"
								}`}
							>
								{section.icon}
								{section.label}
							</button>
						))}
					</nav>

					{/* Content */}
					<div className="flex-1 min-h-0 overflow-y-auto">
						<div className="p-6 max-w-2xl">
							{activeSection === "board" && (
								<BoardSection
									worktreeEnabled={worktreeEnabled}
									setWorktreeEnabled={setWorktreeEnabled}
									mergeStrategy={mergeStrategy}
									setMergeStrategy={setMergeStrategy}
									baseBranch={baseBranch}
									setBaseBranch={setBaseBranch}
								/>
							)}
							{activeSection === "cli-tools" && (
								<CliToolsSection
									toolChecks={toolChecks}
									onCheckTool={checkTool}
									onCheckAll={checkAllTools}
								/>
							)}
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-2 h-14 px-5 border-t border-[#21262d] flex-shrink-0">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onOpenChange(false)}
						className="text-[#8b949e] hover:text-[#e6edf3]"
					>
						Cancel
					</Button>
					<Button
						size="sm"
						onClick={handleSave}
						className="bg-[#238636] hover:bg-[#2ea043] text-white"
					>
						Save
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// ── Board Section ──

function BoardSection({
	worktreeEnabled,
	setWorktreeEnabled,
	mergeStrategy,
	setMergeStrategy,
	baseBranch,
	setBaseBranch,
}: {
	worktreeEnabled: boolean;
	setWorktreeEnabled: (v: boolean) => void;
	mergeStrategy: MergeStrategy;
	setMergeStrategy: (v: MergeStrategy) => void;
	baseBranch: string;
	setBaseBranch: (v: string) => void;
}) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-[13px] font-semibold text-[#e6edf3] mb-1" style={{ fontFamily: "var(--font-display)" }}>
					Board
				</h3>
				<p className="text-[11px] text-[#8b949e]">
					Default settings for agent runs on this board.
				</p>
			</div>

			<div className="space-y-4">
				<h4 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">Agent Defaults</h4>

				<label className="flex items-center gap-2.5 cursor-pointer group">
					<input
						type="checkbox"
						checked={worktreeEnabled}
						onChange={(e) => setWorktreeEnabled(e.target.checked)}
						className="rounded border-[#30363d] bg-[#0d1117] text-[#58a6ff] focus:ring-[#58a6ff]/30 h-3.5 w-3.5"
					/>
					<span className="text-sm text-[#e6edf3] group-hover:text-white transition-colors">
						Enable worktree isolation by default
					</span>
				</label>

				{worktreeEnabled && (
					<div className="ml-6 space-y-4 border-l-2 border-[#21262d] pl-4">
						<div>
							<Label className="mb-1.5">Default merge strategy</Label>
							<select
								value={mergeStrategy}
								onChange={(e) => setMergeStrategy(e.target.value as MergeStrategy)}
								className="w-full h-8 text-sm bg-[#0d1117] border border-[#30363d] rounded-md px-2 text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
							>
								<option value="auto">Auto-merge</option>
								<option value="pr">Create PR</option>
								<option value="manual">Manual</option>
							</select>
						</div>

						<div>
							<Label className="mb-1.5">Default base branch</Label>
							<Input
								value={baseBranch}
								onChange={(e) => setBaseBranch(e.target.value)}
								className="h-8 text-sm"
								placeholder="Defaults to current branch"
							/>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

// ── CLI Tools Section ──

function CliToolsSection({
	toolChecks,
	onCheckTool,
	onCheckAll,
}: {
	toolChecks: Record<string, CliToolCheck | "checking">;
	onCheckTool: (id: string) => void;
	onCheckAll: () => void;
}) {
	const anyChecking = Object.values(toolChecks).some((v) => v === "checking");

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between">
				<div>
					<h3 className="text-[13px] font-semibold text-[#e6edf3] mb-1" style={{ fontFamily: "var(--font-display)" }}>
						CLI Tools
					</h3>
					<p className="text-[11px] text-[#8b949e]">
						Verify that required command-line tools are installed and authenticated.
					</p>
				</div>
				<Button
					size="sm"
					variant="outline"
					onClick={onCheckAll}
					disabled={anyChecking}
					className="border-[#30363d] text-[#e6edf3] hover:bg-[#21262d] flex-shrink-0"
				>
					{anyChecking ? (
						<Loader2 size={12} className="animate-spin" />
					) : (
						<RefreshCw size={12} />
					)}
					Check All
				</Button>
			</div>

			<div className="space-y-1">
				{CLI_TOOLS.map((tool) => (
					<ToolRow
						key={tool.id}
						tool={tool}
						check={toolChecks[tool.id]}
						onCheck={() => onCheckTool(tool.id)}
					/>
				))}
			</div>
		</div>
	);
}

// ── Tool Row ──

function ToolIcon({ toolId }: { toolId: string }) {
	const cls = "text-[#8b949e]";
	switch (toolId) {
		case "claude":
			return <Cpu size={16} className={cls} />;
		case "gh":
			return <Github size={16} className={cls} />;
		case "git":
			return <GitBranch size={16} className={cls} />;
		case "bun":
			return <Terminal size={16} className={cls} />;
		default:
			return <Terminal size={16} className={cls} />;
	}
}

function ToolRow({
	tool,
	check,
	onCheck,
}: {
	tool: (typeof CLI_TOOLS)[number];
	check: CliToolCheck | "checking" | undefined;
	onCheck: () => void;
}) {
	const isChecking = check === "checking";
	const result = check && check !== "checking" ? check : null;
	const hasError = result?.error && !result.installed;
	const hasAuthWarning = result && tool.hasAuth && result.installed && result.authenticated === false;

	return (
		<div className="px-3 py-3 rounded-lg hover:bg-[#161b22] transition-colors group">
			<div className="flex items-center gap-3">
				{/* Icon */}
				<div className="w-8 h-8 rounded-md bg-[#0d1117] border border-[#21262d] flex items-center justify-center flex-shrink-0">
					<ToolIcon toolId={tool.id} />
				</div>

				{/* Info */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<span className="text-[13px] font-medium text-[#e6edf3]">{tool.name}</span>
						<code className="text-[10px] font-mono text-[#6e7681] bg-[#0d1117] px-1.5 py-0.5 rounded border border-[#21262d]">
							{tool.id}
						</code>
					</div>
					<p className="text-[11px] text-[#8b949e] mt-0.5">{tool.description}</p>
				</div>

				{/* Status badges */}
				<div className="flex items-center gap-3 flex-shrink-0">
					{isChecking && (
						<div className="flex items-center gap-1.5 text-[#8b949e]">
							<Loader2 size={13} className="animate-spin" />
							<span className="text-[11px]">Checking...</span>
						</div>
					)}

					{result && (
						<div className="flex items-center gap-3">
							{/* Installed status */}
							<div className="flex items-center gap-1.5" title={result.version ?? undefined}>
								{result.installed ? (
									<CheckCircle2 size={13} className="text-[#3fb950]" />
								) : (
									<XCircle size={13} className="text-[#f85149]" />
								)}
								<span className="text-[11px] font-mono text-[#8b949e]">
									{result.installed ? result.version : "Not found"}
								</span>
							</div>

							{/* Auth status */}
							{tool.hasAuth && result.installed && (
								<div
									className="flex items-center gap-1.5 pl-2 border-l border-[#21262d]"
									title={result.authDetails ?? undefined}
								>
									{result.authenticated ? (
										<CheckCircle2 size={13} className="text-[#3fb950]" />
									) : (
										<XCircle size={13} className="text-[#f85149]" />
									)}
									<span className="text-[11px] text-[#8b949e]">
										{result.authenticated ? "Authenticated" : "Not authenticated"}
									</span>
								</div>
							)}
						</div>
					)}

					{/* Check button */}
					<button
						onClick={onCheck}
						disabled={isChecking}
						className="p-1.5 rounded-md text-[#6e7681] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors disabled:opacity-40 opacity-0 group-hover:opacity-100 focus:opacity-100"
						title={`Check ${tool.name}`}
					>
						<ChevronRight size={14} />
					</button>
				</div>
			</div>

			{/* Error detail — shown below the row, not truncated */}
			{hasError && (
				<div className="mt-2 ml-11 px-2.5 py-2 rounded-md bg-[#f8514908] border border-[#f8514930] text-[11px] text-[#f85149] font-mono leading-relaxed break-all">
					{result.error}
				</div>
			)}

			{/* Auth warning detail */}
			{hasAuthWarning && result.authDetails && (
				<div className="mt-2 ml-11 px-2.5 py-2 rounded-md bg-[#d2992208] border border-[#d2992230] text-[11px] text-[#d29922] font-mono leading-relaxed break-all">
					{result.authDetails}
				</div>
			)}
		</div>
	);
}
