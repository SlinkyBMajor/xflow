## Workflow Engine

The workflow engine compiles a `WorkflowIR` (directed graph of nodes and edges) into an XState state machine that executes nodes sequentially.

### Key files

| File | Role |
|------|------|
| `src/bun/engine/compiler.ts` | Compiles `WorkflowIR` → XState machine. Each node becomes a state with `invoke`, `entry`, or `always` transitions |
| `src/bun/engine/interpolate.ts` | Variable interpolation for node configs |
| `src/bun/engine/runner.ts` | Creates and runs the XState actor |
| `src/mainview/components/ticket/RunEventLog.tsx` | Renders workflow events in the output panel (CMD+J) |

### Context flow between nodes

`WorkflowContext` carries data through the workflow:
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

- Each node's result is stored in `nodeOutputs[nodeId]` via `assign()` in both `onDone` (success) and `onError` (error/timeout) actions
- Node outputs are also persisted to ticket metadata under `_workflowOutput` via `persistNodeOutput()`
- See [data-storage.md](../../.claude/rules/data-storage.md) for the full data flow rules

### Interpolation

Node configs support template variables resolved at runtime via `interpolate()`:
- `{{ticket.title}}`, `{{ticket.id}}`, `{{ticket.laneId}}`, `{{ticket.body}}` — ticket fields
- `{{ticket.metadata.KEY}}` — ticket metadata values (e.g. `{{ticket.metadata.prNumber}}`)
- `{{outputs.NODE_ID}}` — output text from a prior node (auto-unwraps `NodeResult.output`)

### Event pattern

Nodes emit events using `insertAndEmit()` which:
1. Creates a `RunEvent` with `{ id, runId, type, payload, timestamp }`
2. Persists it to the `run_events` table via `runQueries.insertRunEvent()`
3. Streams it to the frontend via the `onEvent` callback

Event types must have a corresponding render case in `RunEventLog.tsx` to display properly (otherwise they fall through to a generic default).

### Compilation pattern

Each node type maps to an XState state configuration in the `switch` block in `compiler.ts`:
- **Sync nodes** (log, setMetadata, notify): use `entry` actions + `always` transition
- **Async nodes** (claudeAgent, customScript): use `invoke` with `fromPromise` + `onDone`/`onError`
- **Branching nodes** (condition): use `always` with guards
- **Waiting nodes** (waitForApproval): use `on` with named events
