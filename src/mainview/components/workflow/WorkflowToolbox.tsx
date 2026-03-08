import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";

export type EdgeStyle = "smoothstep" | "default" | "straight" | "step";

export interface WorkflowToolboxState {
	edgeType: EdgeStyle;
	snapToGrid: boolean;
	snapGrid: number;
	showMinimap: boolean;
	panOnScroll: boolean;
}

interface WorkflowToolboxProps {
	state: WorkflowToolboxState;
	onChange: (state: WorkflowToolboxState) => void;
}

export function WorkflowToolbox({ state, onChange }: WorkflowToolboxProps) {
	const [open, setOpen] = useState(false);

	const update = <K extends keyof WorkflowToolboxState>(
		key: K,
		value: WorkflowToolboxState[K],
	) => {
		onChange({ ...state, [key]: value });
	};

	return (
		<div className="absolute top-3 right-3 z-10">
			<button
				onClick={() => setOpen((v) => !v)}
				className={`p-2 rounded-lg border transition-colors ${
					open
						? "bg-[#21262d] border-[#30363d] text-[#e6edf3]"
						: "bg-[#161b22]/90 border-[#21262d] text-[#8b949e] hover:text-[#e6edf3] hover:border-[#30363d]"
				}`}
			>
				<Settings2 className="w-4 h-4" />
			</button>

			{open && (
				<div className="absolute top-10 right-0 w-56 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl p-3 space-y-3">
					<h3 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
						Canvas Settings
					</h3>

					{/* Edge Type */}
					<div className="space-y-1">
						<Label className="text-xs text-[#8b949e]">Edge Style</Label>
						<Select
							value={state.edgeType}
							onValueChange={(v) => update("edgeType", v as EdgeStyle)}
						>
							<SelectTrigger className="h-7 text-xs bg-[#0d1117] border-[#30363d] text-[#e6edf3]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="bg-[#161b22] border-[#30363d]">
								<SelectItem value="smoothstep" className="text-xs text-[#e6edf3]">Smooth Step</SelectItem>
								<SelectItem value="default" className="text-xs text-[#e6edf3]">Bezier</SelectItem>
								<SelectItem value="straight" className="text-xs text-[#e6edf3]">Straight</SelectItem>
								<SelectItem value="step" className="text-xs text-[#e6edf3]">Step</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Snap to Grid */}
					<div className="flex items-center justify-between">
						<Label className="text-xs text-[#8b949e]">Snap to Grid</Label>
						<Switch
							checked={state.snapToGrid}
							onCheckedChange={(v) => update("snapToGrid", v)}
						/>
					</div>

					{state.snapToGrid && (
						<div className="space-y-1">
							<Label className="text-xs text-[#8b949e]">Grid Size</Label>
							<Select
								value={String(state.snapGrid)}
								onValueChange={(v) => update("snapGrid", Number(v))}
							>
								<SelectTrigger className="h-7 text-xs bg-[#0d1117] border-[#30363d] text-[#e6edf3]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent className="bg-[#161b22] border-[#30363d]">
									<SelectItem value="10" className="text-xs text-[#e6edf3]">10px</SelectItem>
									<SelectItem value="15" className="text-xs text-[#e6edf3]">15px</SelectItem>
									<SelectItem value="20" className="text-xs text-[#e6edf3]">20px</SelectItem>
									<SelectItem value="25" className="text-xs text-[#e6edf3]">25px</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Minimap */}
					<div className="flex items-center justify-between">
						<Label className="text-xs text-[#8b949e]">Minimap</Label>
						<Switch
							checked={state.showMinimap}
							onCheckedChange={(v) => update("showMinimap", v)}
						/>
					</div>

					{/* Pan on Scroll */}
					<div className="flex items-center justify-between">
						<Label className="text-xs text-[#8b949e]">Pan on Scroll</Label>
						<Switch
							checked={state.panOnScroll}
							onCheckedChange={(v) => update("panOnScroll", v)}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
