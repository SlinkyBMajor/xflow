import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import type { BoardSettings } from "../../../shared/types";

interface BoardSettingsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	settings: BoardSettings | null | undefined;
	onSave: (settings: BoardSettings) => void;
}

export function BoardSettingsModal({ open, onOpenChange, settings, onSave }: BoardSettingsModalProps) {
	const [worktreeEnabled, setWorktreeEnabled] = useState(settings?.defaultWorktreeEnabled ?? false);

	const handleSave = () => {
		onSave({
			defaultWorktreeEnabled: worktreeEnabled,
		});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<div className="p-5">
					<DialogHeader className="mb-4">
						<DialogTitle>Board Settings</DialogTitle>
						<DialogDescription className="sr-only">
							Configure default board settings for worktrees and merge strategy
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<div className="space-y-3">
							<h4 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">Agent Defaults</h4>

							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={worktreeEnabled}
									onChange={(e) => setWorktreeEnabled(e.target.checked)}
									className="rounded border-[#30363d] bg-[#0d1117] text-[#58a6ff] focus:ring-[#58a6ff]/30 h-3.5 w-3.5"
								/>
								<span className="text-sm text-[#e6edf3]">Enable worktree isolation by default</span>
							</label>
						</div>
					</div>

					<DialogFooter className="mt-6">
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
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
