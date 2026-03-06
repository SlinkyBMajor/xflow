import { useState } from "react";

interface TicketFormProps {
	initialTitle: string;
	initialBody: string;
	initialTags: string[];
	onSave: (data: { title: string; body: string; tags: string[] }) => void;
	onCancel: () => void;
}

export function TicketForm({ initialTitle, initialBody, initialTags, onSave, onCancel }: TicketFormProps) {
	const [title, setTitle] = useState(initialTitle);
	const [body, setBody] = useState(initialBody);
	const [tagInput, setTagInput] = useState(initialTags.join(", "));

	const handleSubmit = () => {
		const tags = tagInput
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);
		onSave({ title: title.trim(), body, tags });
	};

	return (
		<div className="space-y-4">
			{/* Title */}
			<div>
				<label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-1.5">
					Title
				</label>
				<input
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-600 outline-none focus:border-violet-500/50"
					placeholder="Ticket title"
				/>
			</div>

			{/* Body */}
			<div>
				<label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-1.5">
					Description
				</label>
				<textarea
					value={body}
					onChange={(e) => setBody(e.target.value)}
					rows={6}
					className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-200 placeholder-zinc-600 outline-none focus:border-violet-500/50 resize-none font-mono text-[13px] leading-relaxed"
					placeholder="Markdown supported..."
				/>
			</div>

			{/* Tags */}
			<div>
				<label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-1.5">
					Tags
				</label>
				<input
					value={tagInput}
					onChange={(e) => setTagInput(e.target.value)}
					className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-600 outline-none focus:border-violet-500/50"
					placeholder="Comma-separated tags..."
				/>
			</div>

			{/* Actions */}
			<div className="flex justify-end gap-2 pt-2">
				<button
					onClick={onCancel}
					className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 rounded-md hover:bg-zinc-800 transition-colors"
				>
					Cancel
				</button>
				<button
					onClick={handleSubmit}
					disabled={!title.trim()}
					className="px-4 py-1.5 text-sm font-medium bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md transition-colors"
				>
					Save
				</button>
			</div>
		</div>
	);
}
