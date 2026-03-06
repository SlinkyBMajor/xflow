import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
	open: boolean;
	onClose: () => void;
	children: ReactNode;
	width?: string;
}

export function Modal({ open, onClose, children, width = "max-w-lg" }: ModalProps) {
	const overlayRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [open, onClose]);

	if (!open) return null;

	return (
		<div
			ref={overlayRef}
			className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
			onClick={(e) => {
				if (e.target === overlayRef.current) onClose();
			}}
		>
			<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
			<div
				className={`relative ${width} w-full mx-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl animate-scale-in`}
			>
				{children}
			</div>
		</div>
	);
}
