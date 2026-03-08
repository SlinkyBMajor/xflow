import type { DB } from "../db/connection";
import { validateToken } from "./agent-tokens";
import * as runQueries from "../db/queries/runs";
import * as ticketQueries from "../db/queries/tickets";

interface AgentApiOptions {
	getDb: () => DB;
	notifyBoardChanged: () => void;
}

let server: ReturnType<typeof Bun.serve> | null = null;
let apiOptions: AgentApiOptions | null = null;

export function startAgentApi(options: AgentApiOptions): number {
	if (server) return server.port!;

	apiOptions = options;

	server = Bun.serve({
		hostname: "127.0.0.1",
		port: 0,
		fetch: handleRequest,
	});

	const port = server.port!;
	console.log(`[AgentAPI] Started on port ${port}`);
	return port;
}

export function stopAgentApi(): void {
	if (server) {
		server.stop();
		server = null;
		apiOptions = null;
		console.log("[AgentAPI] Stopped");
	}
}

export function getAgentApiPort(): number | undefined {
	return server?.port;
}

function extractAuth(req: Request): string | null {
	const header = req.headers.get("Authorization");
	if (!header?.startsWith("Bearer ")) return null;
	return header.slice(7);
}

async function handleRequest(req: Request): Promise<Response> {
	const url = new URL(req.url);
	const path = url.pathname;

	// Health check
	if (req.method === "GET" && path === "/health") {
		return Response.json({ status: "ok" });
	}

	// Parse /runs/:runId/...
	const runMatch = path.match(/^\/runs\/([^/]+)\/(.+)$/);
	if (!runMatch) {
		return Response.json({ error: "Not found" }, { status: 404 });
	}

	const [, runId, action] = runMatch;
	const token = extractAuth(req);

	if (!token || !validateToken(runId, token)) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (!apiOptions) {
		return Response.json({ error: "Server not configured" }, { status: 500 });
	}

	const db = apiOptions.getDb();

	// Verify run is active
	const run = runQueries.getRunById(db, runId);
	if (!run || run.status !== "active") {
		return Response.json({ error: "Run not found or not active" }, { status: 404 });
	}

	try {
		switch (action) {
			case "metadata": {
				if (req.method !== "POST") {
					return Response.json({ error: "Method not allowed" }, { status: 405 });
				}
				const body = await req.json() as { key: string; value: unknown };
				if (!body.key) {
					return Response.json({ error: "Missing 'key' field" }, { status: 400 });
				}
				ticketQueries.setMetadataField(db, run.ticketId, body.key, body.value);
				apiOptions.notifyBoardChanged();
				return Response.json({ success: true });
			}

			case "ticket": {
				if (req.method !== "GET") {
					return Response.json({ error: "Method not allowed" }, { status: 405 });
				}
				const ticket = ticketQueries.getTicket(db, run.ticketId);
				if (!ticket) {
					return Response.json({ error: "Ticket not found" }, { status: 404 });
				}
				return Response.json(ticket);
			}

			case "comment": {
				if (req.method !== "POST") {
					return Response.json({ error: "Method not allowed" }, { status: 405 });
				}
				const body = await req.json() as { message: string };
				if (!body.message) {
					return Response.json({ error: "Missing 'message' field" }, { status: 400 });
				}
				runQueries.insertRunEvent(db, {
					id: crypto.randomUUID(),
					runId,
					type: "AGENT_COMMENT",
					payload: { message: body.message },
					timestamp: new Date().toISOString(),
				});
				return Response.json({ success: true });
			}

			default:
				return Response.json({ error: "Not found" }, { status: 404 });
		}
	} catch (err) {
		console.error(`[AgentAPI] Error handling ${action}:`, err);
		return Response.json({ error: "Internal server error" }, { status: 500 });
	}
}
