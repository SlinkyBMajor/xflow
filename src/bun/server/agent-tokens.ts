const tokenStore = new Map<string, string>();

export function createToken(runId: string): string {
	const token = crypto.randomUUID();
	tokenStore.set(runId, token);
	return token;
}

export function validateToken(runId: string, token: string): boolean {
	return tokenStore.get(runId) === token;
}

export function revokeToken(runId: string): void {
	tokenStore.delete(runId);
}
