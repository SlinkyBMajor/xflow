import { useState, useRef, useCallback } from "react";
import { copyToClipboard } from "../lib/clipboard";

export function useCopyFeedback(timeout = 1500) {
	const [copied, setCopied] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout>>();

	const copy = useCallback(async (text: string) => {
		const ok = await copyToClipboard(text);
		if (ok) {
			setCopied(true);
			clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => setCopied(false), timeout);
		}
		return ok;
	}, [timeout]);

	return { copied, copy };
}
