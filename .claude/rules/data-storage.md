## Data Storage

XFlow has three storage layers. Each has a clear purpose — pick the right one based on lifetime, audience, and access pattern.

### 1. SQLite tables (durable, queryable)

The DB schema (`src/bun/db/schema.ts`) is the permanent record. Data here survives restarts and is queryable with SQL.

| Table | Stores | Written when |
|-------|--------|-------------|
| `tickets` | Ticket row + `metadata` JSON column | Lane transitions, run lifecycle events, `setMetadata` nodes |
| `workflow_runs` | Run state, worktree info, merge results | Node transitions, run start/end |
| `run_events` | Timestamped event log per run | Every node action via `insertAndEmit()` |
| `boards`, `lanes`, `workflows` | Board structure and workflow definitions | User edits |

**Rules:**
- The view layer never touches the DB directly — all access goes through RPC.
- Write to `tickets.metadata` at lifecycle boundaries (lane transitions, run start/end, errors) or when a node's purpose is to produce data for downstream consumption (`setMetadata`, `persistNodeOutput`, `gitAction` writing `prNumber`/`prUrl`/`branch`). Do not write metadata as a side effect of nodes whose primary job is something else.
- Derive granular data (timing, progress, lane history) from `run_events` on read. Do not denormalize it onto the ticket.
- See `docs/ticket-metadata.md` for the full data flow.

### 2. Ticket metadata JSON (`ticket.metadata`)

The `metadata` column on the `tickets` table is a JSON object for semi-structured data. It holds two kinds of data:

**User-facing metadata** — counters, error messages, custom key-value pairs set by `setMetadata` nodes. Accessed via `{{ticket.metadata.KEY}}` interpolation or `metadata.KEY` in conditions.

**Internal metadata** — prefixed with `_` to avoid collisions:
- `_workflowOutput` — array of `WorkflowOutputEntry` objects recording each node's result across all runs. Capped at 50 entries, output truncated to 10KB each. Written by `persistNodeOutput()` in `executor.ts`.

**Rules:**
- Never access `_workflowOutput` directly in condition expressions. It is an array, not a keyed object. Use the `outputs` scope instead (see below).
- Treat `_`-prefixed keys as internal — do not expose them in user-facing UI or let `setMetadata` nodes overwrite them.

### 3. XState context (ephemeral, in-memory)

`WorkflowContext` lives inside the XState actor for the duration of a single run. It carries data between nodes without a DB round-trip.

```ts
interface WorkflowContext {
  ticket: Ticket;
  nodeOutputs: Record<string, NodeResult>;
}

interface NodeResult {
  status: "success" | "error" | "timeout" | "partial";
  output: unknown;
}
```

**`nodeOutputs`** is the runtime cache of node results:
- Written by `makeDoneActions` (success) and `makeErrorActions` (error/timeout) in `compiler.ts`
- Read by condition expressions: `outputs["node-id"]?.status === "success"`
- Read by interpolation: `{{outputs.NODE_ID}}` — auto-unwraps `NodeResult.output` to a string
- On resume, hydrated from `_workflowOutput` entries matching the current `runId`

**Rules:**
- Always store `NodeResult { status, output }`, never raw values. Raw values break condition expressions.
- Both `nodeOutputs` and `_workflowOutput` must be written together in the same `assign()` block to stay in sync.
- DB (`_workflowOutput`) is the source of truth. `nodeOutputs` is always derivable from it for a given run.

### Choosing where to store data

| Question | Answer | Store in |
|----------|--------|----------|
| Does it need to survive app restarts? | Yes | DB table or ticket metadata |
| Is it only needed by downstream nodes in the same run? | Yes | XState context (auto-persisted to DB by `makeDoneActions`) |
| Is it a timestamped event for audit/debugging? | Yes | `run_events` table via `insertAndEmit()` |
| Is it a user-set key-value pair on a ticket? | Yes | `ticket.metadata` via `setMetadata` node or `updateTicket` |
| Is it structural (boards, lanes, workflows)? | Yes | Dedicated DB table |
