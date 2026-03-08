import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import type { BoardSettings, MergeStrategy } from "../../../shared/types";

interface BoardSettingsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	settings: BoardSettings | null | undefined;
	onSave: (settings: BoardSettings) => void;
}

export function BoardSettingsModal({ open, onOpenChange, settings, onSave }: BoardSettingsModalProps) {
	const [worktreeEnabled, setWorktreeEnabled] = useState(settings?.defaultWorktreeEnabled ?? false);
	const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>(settings?.defaultMergeStrategy ?? "manual");
	const [baseBranch, setBaseBranch] = useState(settings?.defaultBaseBranch ?? "");

	const handleSave = () => {
		onSave({
			defaultWorktreeEnabled: worktreeEnabled,
			defaultMergeStrategy: mergeStrategy,
			defaultBaseBranch: baseBranch || undefined,
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

							{worktreeEnabled && (
								<>
									<div>
										<Label className="text-xs text-[#8b949e] mb-1.5">Default merge strategy</Label>
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
										<Label className="text-xs text-[#8b949e] mb-1.5">Default base branch</Label>
										<Input
											value={baseBranch}
											onChange={(e) => setBaseBranch(e.target.value)}
											className="h-8 text-sm"
											placeholder="Defaults to current branch"
										/>
									</div>
								</>
							)}
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
