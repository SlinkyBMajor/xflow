import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "../ui/dialog";
import { NODE_REGISTRY } from "../../../shared/node-registry";

interface NodeReferenceModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function NodeReferenceModal({ open, onOpenChange }: NodeReferenceModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col p-0">
				<DialogHeader className="px-5 pt-5 pb-3 border-b border-[#21262d]">
					<DialogTitle>Node Reference</DialogTitle>
					<DialogDescription>
						All available node types for building workflows.
					</DialogDescription>
				</DialogHeader>
				<div className="overflow-y-auto px-5 py-4 space-y-6">
					{NODE_REGISTRY.map((group) => (
						<div key={group.label}>
							<h3 className="text-[10px] font-semibold text-[#6e7681] uppercase tracking-widest mb-3 font-mono">
								{group.label}
							</h3>
							<div className="space-y-3">
								{group.items.map((item) => (
									<div
										key={item.type}
										className="rounded-lg border border-[#21262d] bg-[#0d1117]/50 p-3"
									>
										<div className="flex items-center gap-2 mb-1.5">
											<div
												className="w-2 h-2 rounded-full flex-shrink-0"
												style={{ backgroundColor: item.color }}
											/>
											<span className="text-[13px] font-semibold text-[#e6edf3]">
												{item.label}
											</span>
										</div>
										<p className="text-xs text-[#8b949e] leading-relaxed mb-2">
											{item.description}
										</p>
										{item.config.length > 0 && (
											<div className="mb-2">
												<span className="text-[10px] font-semibold text-[#6e7681] uppercase tracking-wider">
													Config
												</span>
												<ul className="mt-1 space-y-0.5">
													{item.config.map((c) => (
														<li key={c} className="text-xs text-[#8b949e] pl-2">
															<span className="text-[#6e7681] mr-1">•</span>
															<span className="text-[#e6edf3] font-mono text-[11px]">
																{c.split(" — ")[0]}
															</span>
															{c.includes(" — ") && (
																<span className="text-[#8b949e]">
																	{" — "}
																	{c.split(" — ").slice(1).join(" — ")}
																</span>
															)}
														</li>
													))}
												</ul>
											</div>
										)}
										{item.events && (
											<div>
												<span className="text-[10px] font-semibold text-[#6e7681] uppercase tracking-wider">
													Events
												</span>
												<div className="flex gap-1.5 mt-1">
													{item.events.map((evt) => (
														<span
															key={evt}
															className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e]"
														>
															{evt}
														</span>
													))}
												</div>
											</div>
										)}
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
