# Agent Callback HTTP API

## Purpose

Agents spawned by XFlow need a way to communicate metadata back during execution — for example, setting ticket complexity, reading current ticket data, or posting comments to the run log. The callback API provides this via a lightweight local HTTP server.

## Architecture

One `Bun.serve` instance per project, bound to `127.0.0.1:0` (OS-assigned port). Started on project open, stopped on close. Runs are distinguished by URL path and bearer token.

## Routes

| Method | Path | Body | Purpose |
|--------|------|------|---------|
| `POST` | `/runs/:runId/metadata` | `{ key, value }` | Set a ticket metadata field |
| `GET` | `/runs/:runId/ticket` | — | Get current ticket data |
| `POST` | `/runs/:runId/comment` | `{ message }` | Add a comment to the run event log |
| `GET` | `/health` | — | Health check |

All `/runs/` routes validate the bearer token and check that the run is active.

## Authentication

Per-run bearer tokens managed by `src/bun/server/agent-tokens.ts`:
- `createToken(runId)` — generates a UUID token when the agent starts
- `validateToken(runId, token)` — checks against the stored token
- `revokeToken(runId)` — called in the `finally` block after the agent process exits

## Environment Variables

The agent process receives these env vars:

| Variable | Value |
|----------|-------|
| `XFLOW_API_URL` | `http://127.0.0.1:<port>` |
| `XFLOW_RUN_ID` | The current run's UUID |
| `XFLOW_API_TOKEN` | Bearer token for this run |
| `XFLOW_TICKET_ID` | The ticket's UUID |

## Agent Context Docs

When the API is available, the agent's context document includes an "XFlow API" section with curl examples so Claude knows how to call back:

```bash
curl -X POST $XFLOW_API_URL/runs/$XFLOW_RUN_ID/metadata \
  -H "Authorization: Bearer $XFLOW_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "complexity", "value": "high"}'
```

## Key Files

| File | Role |
|------|------|
| `src/bun/server/agent-api.ts` | HTTP server, route handling |
| `src/bun/server/agent-tokens.ts` | Token create/validate/revoke |
| `src/bun/engine/agent.ts` | Sets env vars, creates/revokes tokens, appends API docs |
| `src/bun/project/open.ts` | Starts server on project open |
| `src/bun/rpc.ts` | Threads `apiPort` to trigger/runner/compiler |

## Data Flow

```
POST /runs/:runId/metadata { key: "complexity", value: "high" }
  → validateToken(runId, bearer)
  → verify run is active
  → ticketQueries.setMetadataField(db, ticketId, key, value)
  → notifyBoardChanged() → frontend receives boardUpdated message
```

## Design Decisions

- **One server per project, not per run**: simpler lifecycle, single port. Runs are distinguished by path + bearer token.
- **curl over MCP**: The agent calls the API via `curl` in its bash tool. No MCP server needed — this is the simplest, most reliable approach for Claude Code.
- **Token revocation in `finally`**: Tokens are always revoked after the agent exits, even on timeout or error.
