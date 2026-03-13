import * as React from "react";
import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { Textarea } from "./textarea";
import { Button } from "./button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "./dialog";
import { cn } from "@/lib/utils";

interface ExpandableTextareaProps extends React.ComponentProps<typeof Textarea> {
	label: string;
	mono?: boolean;
}

const ExpandableTextarea = React.forwardRef<
	HTMLTextAreaElement,
	ExpandableTextareaProps
>(({ label, mono, className, ...props }, ref) => {
	const [open, setOpen] = useState(false);

	return (
		<div className="relative">
			<Textarea ref={ref} className={className} {...props} />
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="absolute top-1 right-1 h-6 w-6 text-[#484f58] hover:text-[#e6edf3] opacity-0 hover:opacity-100 focus:opacity-100 [div:hover>&]:opacity-100"
				onClick={() => setOpen(true)}
			>
				<Maximize2 className="h-3 w-3" />
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-3xl p-6">
					<DialogHeader>
						<DialogTitle>{label}</DialogTitle>
					</DialogHeader>
					<Textarea
						value={props.value}
						onChange={props.onChange}
						placeholder={props.placeholder}
						className={cn(
							"text-sm min-h-[50vh] resize-y",
							mono && "font-mono",
						)}
					/>
				</DialogContent>
			</Dialog>
		</div>
	);
});
ExpandableTextarea.displayName = "ExpandableTextarea";

export { ExpandableTextarea };
export type { ExpandableTextareaProps };
