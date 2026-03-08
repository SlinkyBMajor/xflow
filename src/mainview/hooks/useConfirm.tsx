import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../components/ui/alert-dialog";

interface ConfirmOptions {
	title: string;
	description?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: "danger" | "default";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const [options, setOptions] = useState<ConfirmOptions | null>(null);
	const resolveRef = useRef<((value: boolean) => void) | null>(null);

	const confirm = useCallback<ConfirmFn>((opts) => {
		setOptions(opts);
		setOpen(true);
		return new Promise<boolean>((resolve) => {
			resolveRef.current = resolve;
		});
	}, []);

	const handleAction = () => {
		resolveRef.current?.(true);
		resolveRef.current = null;
		setOpen(false);
	};

	const handleCancel = () => {
		resolveRef.current?.(false);
		resolveRef.current = null;
		setOpen(false);
	};

	const isDanger = options?.variant === "danger";

	return (
		<ConfirmContext.Provider value={confirm}>
			{children}
			<AlertDialog open={open} onOpenChange={(v) => !v && handleCancel()}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{options?.title}</AlertDialogTitle>
						{options?.description && (
							<AlertDialogDescription>{options.description}</AlertDialogDescription>
						)}
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleCancel}>
							{options?.cancelLabel ?? "Cancel"}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleAction}
							className={isDanger ? undefined : "bg-[#238636] hover:bg-[#2ea043] focus:ring-[#238636]"}
						>
							{options?.confirmLabel ?? "Confirm"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</ConfirmContext.Provider>
	);
}

export function useConfirm(): ConfirmFn {
	const confirm = useContext(ConfirmContext);
	if (!confirm) {
		throw new Error("useConfirm must be used within a ConfirmProvider");
	}
	return confirm;
}
