import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "../ui/dialog";
import { getShortcutsByGroup } from "../../lib/shortcut-registry";

interface HelpModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
	const groups = getShortcutsByGroup();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col p-0">
				<DialogHeader className="px-5 pt-5 pb-3 border-b border-[#21262d]">
					<DialogTitle>Keyboard Shortcuts</DialogTitle>
					<DialogDescription>
						Quick reference for all available shortcuts.
					</DialogDescription>
				</DialogHeader>
				<div className="overflow-y-auto px-5 py-4 space-y-5">
					{Object.entries(groups).map(([group, shortcuts]) => (
						<div key={group}>
							<h3 className="text-[10px] font-semibold text-[#6e7681] uppercase tracking-widest mb-2.5 font-mono">
								{group}
							</h3>
							<div className="space-y-px rounded-lg border border-[#21262d] overflow-hidden">
								{shortcuts.map((shortcut, i) => (
									<div
										key={shortcut.id}
										className={`flex items-center justify-between px-3 py-2.5 bg-[#0d1117]/50 ${
											i < shortcuts.length - 1 ? "border-b border-[#21262d]/60" : ""
										}`}
									>
										<div className="flex flex-col gap-0.5">
											<span className="text-[13px] text-[#e6edf3]">
												{shortcut.label}
											</span>
											{shortcut.description && (
												<span className="text-[11px] text-[#6e7681]">
													{shortcut.description}
												</span>
											)}
										</div>
										<kbd className="ml-4 flex-shrink-0 inline-flex items-center gap-0.5 px-2 py-1 rounded-md border border-[#30363d] bg-[#21262d] text-[11px] font-mono text-[#8b949e] shadow-[0_1px_0_0_#0d1117,inset_0_1px_0_0_rgba(255,255,255,0.03)]">
											{shortcut.keys}
										</kbd>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
