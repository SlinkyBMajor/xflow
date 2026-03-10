export function createListenerSet<T extends (...args: any[]) => void>() {
	const listeners = new Set<T>();
	return {
		listeners,
		emit(...args: Parameters<T>) {
			for (const l of listeners) l(...args);
		},
		subscribe(listener: T): () => void {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}
