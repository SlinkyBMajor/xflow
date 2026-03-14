import { useState, useCallback, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "../ui/dialog";
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
	Kanban,
	Database,
	Download,
	Upload,
} from "lucide-react";
import { toast } from "sonner";
import { rpc, requestFilePicker } from "../../rpc";
import { useConfirm } from "../../hooks/useConfirm";
import type { BoardSettings, CliToolCheck } from "../../../shared/types";

// ── Types ──

type SettingsSection = "board" | "git" | "cli-tools" | "data";

interface SettingsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	settings: BoardSettings | null | undefined;
	onSave: (settings: BoardSettings) => void;
	onDatabaseReset?: () => void;
}

// ── Tool definitions ──

const CLI_TOOLS = [
	{ id: "claude", name: "Claude Code", description: "AI coding assistant CLI", hasAuth: true },
	{ id: "gh", name: "GitHub CLI", description: "GitHub from the command line", hasAuth: true },
	{ id: "git", name: "Git", description: "Version control", hasAuth: false },
	{ id: "bun", name: "Bun", description: "JavaScript runtime & toolkit", hasAuth: false },
] as const;

// ── Component ──

export function SettingsModal({ open, onOpenChange, settings, onSave, onDatabaseReset }: SettingsModalProps) {
	const [activeSection, setActiveSection] = useState<SettingsSection>("board");

	// Board settings state
	const [worktreeEnabled, setWorktreeEnabled] = useState(settings?.defaultWorktreeEnabled ?? false);

	// Git settings state
	const [prPollingEnabled, setPrPollingEnabled] = useState(settings?.prPollingEnabled !== false);

	// CLI tools state
	const [toolChecks, setToolChecks] = useState<Record<string, CliToolCheck | "checking">>({});

	// Sync settings when modal opens
	useEffect(() => {
		if (open) {
			setWorktreeEnabled(settings?.defaultWorktreeEnabled ?? false);
			setPrPollingEnabled(settings?.prPollingEnabled !== false);
		}
	}, [open, settings]);

	const handleSave = () => {
		onSave({
			defaultWorktreeEnabled: worktreeEnabled,
			prPollingEnabled,
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
			icon: <Kanban size={14} />,
		},
		{
			id: "git",
			label: "Git",
			icon: <GitBranch size={14} />,
		},
		{
			id: "cli-tools",
			label: "CLI Tools",
			icon: <Terminal size={14} />,
		},
		{
			id: "data",
			label: "Data",
			icon: <Database size={14} />,
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
								/>
							)}
							{activeSection === "git" && (
								<GitSection
									prPollingEnabled={prPollingEnabled}
									setPrPollingEnabled={setPrPollingEnabled}
								/>
							)}
							{activeSection === "cli-tools" && (
								<CliToolsSection
									toolChecks={toolChecks}
									onCheckTool={checkTool}
									onCheckAll={checkAllTools}
								/>
							)}
							{activeSection === "data" && (
								<DataSection
									onDatabaseReset={() => {
										onOpenChange(false);
										onDatabaseReset?.();
									}}
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
}: {
	worktreeEnabled: boolean;
	setWorktreeEnabled: (v: boolean) => void;
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
			</div>
		</div>
	);
}

// ── Git Section ──

function GitSection({
	prPollingEnabled,
	setPrPollingEnabled,
}: {
	prPollingEnabled: boolean;
	setPrPollingEnabled: (v: boolean) => void;
}) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-[13px] font-semibold text-[#e6edf3] mb-1" style={{ fontFamily: "var(--font-display)" }}>
					Git
				</h3>
				<p className="text-[11px] text-[#8b949e]">
					Configure how XFlow interacts with Git and GitHub.
				</p>
			</div>

			<div className="space-y-1">
				<div className="px-3 py-3 rounded-lg hover:bg-[#161b22] transition-colors">
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 rounded-md bg-[#0d1117] border border-[#21262d] flex items-center justify-center flex-shrink-0">
							<RefreshCw size={16} className="text-[#8b949e]" />
						</div>

						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2">
								<span className="text-[13px] font-medium text-[#e6edf3]">PR Status Polling</span>
							</div>
							<p className="text-[11px] text-[#8b949e] mt-0.5">
								Automatically check open pull requests for merge status every 60 seconds.
							</p>
						</div>

						<div className="flex items-center flex-shrink-0">
							<label className="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									checked={prPollingEnabled}
									onChange={(e) => setPrPollingEnabled(e.target.checked)}
									className="sr-only peer"
								/>
								<div className="w-8 h-[18px] bg-[#21262d] peer-focus:outline-none rounded-full peer peer-checked:bg-[#238636] transition-colors after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-[#8b949e] after:peer-checked:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-[14px]" />
							</label>
						</div>
					</div>
				</div>
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

// ── Data Section ──

function DataSection({ onDatabaseReset }: { onDatabaseReset: () => void }) {
	const confirm = useConfirm();
	const [resettingTickets, setResettingTickets] = useState(false);
	const [resettingDb, setResettingDb] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [importing, setImporting] = useState(false);

	const handleExport = async () => {
		setExporting(true);
		try {
			const { path } = await rpc.request.exportBoard({});
			toast.success(`Board exported to ${path}`);
		} catch (err) {
			toast.error(`Export failed: ${err}`);
		} finally {
			setExporting(false);
		}
	};

	const handleImport = async () => {
		setImporting(true);
		try {
			const path = await requestFilePicker();
			if (!path) {
				setImporting(false);
				return;
			}

			const confirmed = await confirm({
				title: "Import board configuration?",
				description:
					"This will replace all lanes and workflows with the imported configuration. All existing tickets will be deleted.",
				confirmLabel: "Import",
				variant: "danger",
			});
			if (!confirmed) {
				setImporting(false);
				return;
			}

			await rpc.request.importBoard({ path });
			toast.success("Board imported successfully");
			onDatabaseReset();
		} catch (err) {
			toast.error(`Import failed: ${err}`);
		} finally {
			setImporting(false);
		}
	};

	const handleResetTickets = async () => {
		const confirmed = await confirm({
			title: "Delete all tickets?",
			description:
				"This will permanently delete all tickets, comments, and run history. Lanes and workflows will be kept.",
			confirmLabel: "Delete All Tickets",
			variant: "danger",
		});
		if (!confirmed) return;

		setResettingTickets(true);
		try {
			await rpc.request.resetAllTickets({});
			toast.success("All tickets deleted");
			onDatabaseReset();
		} catch (err) {
			toast.error(`Failed to delete tickets: ${err}`);
			setResettingTickets(false);
		}
	};

	const handleResetDatabase = async () => {
		const confirmed = await confirm({
			title: "Reset entire database?",
			description:
				"This will permanently delete everything — boards, lanes, tickets, workflows, and run history. This cannot be undone.",
			confirmLabel: "Reset Database",
			variant: "danger",
		});
		if (!confirmed) return;

		setResettingDb(true);
		try {
			await rpc.request.resetDatabase({});
			toast.success("Database reset successfully");
			onDatabaseReset();
		} catch (err) {
			toast.error(`Failed to reset database: ${err}`);
			setResettingDb(false);
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h3
					className="text-[13px] font-semibold text-[#e6edf3] mb-1"
					style={{ fontFamily: "var(--font-display)" }}
				>
					Data
				</h3>
				<p className="text-[11px] text-[#8b949e]">
					Manage the local database for this project.
				</p>
			</div>

			<div className="space-y-4">
				<h4 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
					Backup & Restore
				</h4>

				<div className="rounded-lg border border-[#30363d] divide-y divide-[#30363d]">
					<div className="flex items-center justify-between gap-4 p-4">
						<div>
							<p className="text-[13px] font-medium text-[#e6edf3]">
								Export board
							</p>
							<p className="text-[11px] text-[#8b949e] mt-0.5">
								Save lanes, workflows, and board settings to a JSON file.
							</p>
						</div>
						<Button
							size="sm"
							variant="outline"
							onClick={handleExport}
							disabled={exporting}
							className="border-[#30363d] text-[#e6edf3] hover:bg-[#21262d] flex-shrink-0"
						>
							{exporting ? (
								<Loader2 size={12} className="animate-spin" />
							) : (
								<Download size={12} />
							)}
							Export
						</Button>
					</div>

					<div className="flex items-center justify-between gap-4 p-4">
						<div>
							<p className="text-[13px] font-medium text-[#e6edf3]">
								Import board
							</p>
							<p className="text-[11px] text-[#8b949e] mt-0.5">
								Load lanes and workflows from a previously exported JSON file. Replaces current configuration.
							</p>
						</div>
						<Button
							size="sm"
							variant="outline"
							onClick={handleImport}
							disabled={importing}
							className="border-[#30363d] text-[#e6edf3] hover:bg-[#21262d] flex-shrink-0"
						>
							{importing ? (
								<Loader2 size={12} className="animate-spin" />
							) : (
								<Upload size={12} />
							)}
							Import
						</Button>
					</div>
				</div>
			</div>

			<div className="space-y-4">
				<h4 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
					Danger Zone
				</h4>

				<div className="rounded-lg border border-[#f8514930] divide-y divide-[#f8514930]">
					<div className="flex items-center justify-between gap-4 p-4">
						<div>
							<p className="text-[13px] font-medium text-[#e6edf3]">
								Delete all tickets
							</p>
							<p className="text-[11px] text-[#8b949e] mt-0.5">
								Remove all tickets, comments, and run history. Lanes and workflows are preserved.
							</p>
						</div>
						<Button
							size="sm"
							variant="outline"
							onClick={handleResetTickets}
							disabled={resettingTickets}
							className="border-[#f8514930] text-[#f85149] hover:bg-[#f8514915] hover:text-[#f85149] flex-shrink-0"
						>
							{resettingTickets ? (
								<Loader2 size={12} className="animate-spin" />
							) : (
								<Database size={12} />
							)}
							Delete
						</Button>
					</div>

					<div className="flex items-center justify-between gap-4 p-4">
						<div>
							<p className="text-[13px] font-medium text-[#e6edf3]">
								Reset database
							</p>
							<p className="text-[11px] text-[#8b949e] mt-0.5">
								Delete all data and start fresh. Lanes, workflows, tickets, and run history will be permanently removed.
							</p>
						</div>
						<Button
							size="sm"
							variant="outline"
							onClick={handleResetDatabase}
							disabled={resettingDb}
							className="border-[#f8514930] text-[#f85149] hover:bg-[#f8514915] hover:text-[#f85149] flex-shrink-0"
						>
							{resettingDb ? (
								<Loader2 size={12} className="animate-spin" />
							) : (
								<Database size={12} />
							)}
							Reset
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

// ── Tool Row ──

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
