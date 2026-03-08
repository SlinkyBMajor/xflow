import { useState, useEffect } from "react";
import type { BoardTemplate } from "../../../shared/types";
import { useTemplates } from "../../hooks/useTemplates";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface TemplateManagerProps {
	onApply: () => void;
	onClose: () => void;
}

export function TemplateManager({ onApply, onClose }: TemplateManagerProps) {
	const { templates, loading, fetchTemplates, exportBoard, applyTemplate, deleteTemplate } = useTemplates();
	const [showExport, setShowExport] = useState(false);
	const [exportName, setExportName] = useState("");
	const [exportDesc, setExportDesc] = useState("");
	const [applying, setApplying] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchTemplates();
	}, [fetchTemplates]);

	const handleApply = async (template: BoardTemplate) => {
		setError(null);
		setApplying(true);
		try {
			await applyTemplate(template.id);
			onApply();
		} catch (err: any) {
			setError(err.message ?? "Failed to apply template");
		} finally {
			setApplying(false);
		}
	};

	const handleExport = async () => {
		const trimmed = exportName.trim();
		if (!trimmed) return;
		try {
			await exportBoard(trimmed, exportDesc.trim() || undefined);
			setShowExport(false);
			setExportName("");
			setExportDesc("");
		} catch (err: any) {
			setError(err.message ?? "Failed to export template");
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
			<div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl w-[560px] max-h-[80vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-[#21262d]/60">
					<h2 className="text-sm font-semibold text-[#e6edf3]">Board Templates</h2>
					<button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3] transition-colors">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
						</svg>
					</button>
				</div>

				{/* Error */}
				{error && (
					<div className="mx-5 mt-3 px-3 py-2 rounded-md bg-red-950/40 border border-red-900/50 text-xs text-red-400">
						{error}
					</div>
				)}

				{/* Template grid */}
				<div className="flex-1 overflow-y-auto p-5">
					{loading ? (
						<p className="text-xs text-[#8b949e]">Loading templates...</p>
					) : (
						<div className="grid grid-cols-2 gap-3">
							{templates.map((t) => (
								<TemplateCard
									key={t.id}
									template={t}
									onApply={() => handleApply(t)}
									onDelete={t.builtIn ? undefined : () => deleteTemplate(t.id)}
									applying={applying}
								/>
							))}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="px-5 py-3 border-t border-[#21262d]/60">
					{showExport ? (
						<div className="space-y-2">
							<div>
								<Label className="text-xs text-[#8b949e]">Template Name</Label>
								<Input
									autoFocus
									value={exportName}
									onChange={(e) => setExportName(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && handleExport()}
									className="h-8 text-sm mt-1"
									placeholder="My Template"
								/>
							</div>
							<div>
								<Label className="text-xs text-[#8b949e]">Description (optional)</Label>
								<Input
									value={exportDesc}
									onChange={(e) => setExportDesc(e.target.value)}
									className="h-8 text-sm mt-1"
									placeholder="Board layout with workflows"
								/>
							</div>
							<div className="flex gap-2 pt-1">
								<Button size="sm" onClick={handleExport} className="bg-[#238636] hover:bg-[#2ea043] text-white">
									Export
								</Button>
								<Button size="sm" variant="ghost" onClick={() => setShowExport(false)}>
									Cancel
								</Button>
							</div>
						</div>
					) : (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowExport(true)}
							className="text-[#8b949e] hover:text-[#e6edf3] w-full"
						>
							Export Current Board as Template
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}

function TemplateCard({
	template,
	onApply,
	onDelete,
	applying,
}: {
	template: BoardTemplate;
	onApply: () => void;
	onDelete?: () => void;
	applying: boolean;
}) {
	const laneColors = template.lanes.map((l) => l.color ?? "#71717a");

	return (
		<div className="p-3.5 rounded-lg bg-[#21262d]/40 border border-[#21262d] hover:border-[#30363d] transition-colors">
			<div className="flex items-start justify-between mb-2">
				<div>
					<h3 className="text-[13px] font-medium text-[#e6edf3]">{template.name}</h3>
					{template.builtIn && (
						<span className="text-[9px] font-mono text-[#8b949e] uppercase tracking-wider">Built-in</span>
					)}
				</div>
			</div>

			{template.description && (
				<p className="text-[11px] text-[#8b949e] mb-2 line-clamp-2">{template.description}</p>
			)}

			{/* Lane preview */}
			<div className="flex gap-1 mb-3">
				{laneColors.map((color, i) => (
					<div key={i} className="flex-1 h-1 rounded-full" style={{ backgroundColor: color, opacity: 0.6 }} />
				))}
			</div>

			<p className="text-[10px] text-[#6e7681] mb-2.5">
				{template.lanes.length} lanes
				{template.lanes.some((l) => l.workflow) && " + workflows"}
			</p>

			<div className="flex gap-1.5">
				<Button
					size="sm"
					onClick={onApply}
					disabled={applying}
					className="flex-1 h-7 text-xs bg-[#238636]/80 hover:bg-[#2ea043] text-white"
				>
					Apply
				</Button>
				{onDelete && (
					<Button
						size="sm"
						variant="ghost"
						onClick={onDelete}
						className="h-7 text-xs text-[#8b949e] hover:text-red-400 hover:bg-red-950/30 px-2"
					>
						<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
							<path d="M3 3.5h6M4.5 3.5V3a1 1 0 011-1h1a1 1 0 011 1v.5M4.5 5v3.5M7.5 5v3.5M3.5 3.5l.5 6a1 1 0 001 1h2a1 1 0 001-1l.5-6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
						</svg>
					</Button>
				)}
			</div>
		</div>
	);
}
