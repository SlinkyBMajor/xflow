import { Pencil } from "lucide-react";
import { Button } from "../ui/button";

interface TicketViewProps {
	title: string;
	body: string;
	tags: string[];
	onEdit: () => void;
}

export function TicketView({ title, body, tags, onEdit }: TicketViewProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-start justify-between gap-3">
				<h2 className="text-[18px] font-semibold text-[#e6edf3] leading-snug">
					{title}
				</h2>
				<Button
					variant="ghost"
					size="sm"
					onClick={onEdit}
					className="text-[#6e7681] hover:text-[#e6edf3] h-auto px-2 py-1 shrink-0"
				>
					<Pencil size={14} />
				</Button>
			</div>

			{body && (
				<pre className="text-[13px] font-mono text-[#8b949e] whitespace-pre-wrap break-words leading-relaxed">
					{body}
				</pre>
			)}

			{tags.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{tags.map((tag) => (
						<span
							key={tag}
							className="text-[11px] px-2 py-0.5 rounded-full bg-[#21262d] text-[#8b949e] border border-[#30363d]"
						>
							{tag}
						</span>
					))}
				</div>
			)}
		</div>
	);
}
