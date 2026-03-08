import { useState } from "react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Button } from "../ui/button";

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
			<div>
				<Label htmlFor="ticket-title" className="mb-1.5">Title</Label>
				<Input
					id="ticket-title"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					placeholder="Ticket title"
				/>
			</div>

			<div>
				<Label htmlFor="ticket-body" className="mb-1.5">Description</Label>
				<Textarea
					id="ticket-body"
					value={body}
					onChange={(e) => setBody(e.target.value)}
					rows={6}
					className="font-mono text-[13px] leading-relaxed"
					placeholder="Markdown supported..."
				/>
			</div>

			<div>
				<Label htmlFor="ticket-tags" className="mb-1.5">Tags</Label>
				<Input
					id="ticket-tags"
					value={tagInput}
					onChange={(e) => setTagInput(e.target.value)}
					placeholder="Comma-separated tags..."
				/>
			</div>

			<div className="flex justify-end gap-2 pt-2">
				<Button variant="ghost" size="sm" onClick={onCancel}>
					Cancel
				</Button>
				<Button
					size="sm"
					onClick={handleSubmit}
					disabled={!title.trim()}
					className="bg-[#238636] hover:bg-[#2ea043] text-white"
				>
					Save
				</Button>
			</div>
		</div>
	);
}
