# Agent Execution & Output Pipeline

## Claude CLI Invocation

Agents are spawned via `src/bun/engine/agent.ts`:

```
claude -p <prompt> --output-format stream-json --verbose --dangerously-skip-permissions
```

- `--output-format stream-json` — newline-delimited JSON events on stdout
- `--verbose` — includes tool use details in the stream
- `--dangerously-skip-permissions` — allows tool use without user approval
- CWD is the project path

## stream-json Event Format

Each line of stdout is a JSON object. Key event types:

| Type | Structure | Purpose |
|------|-----------|---------|
| `system` | `{ type: "system", subtype: "init", tools: [...], model: "..." }` | Session metadata |
| `assistant` | `{ type: "assistant", message: { content: [{ type: "text", text: "..." }] } }` | Response chunks (may appear multiple times with tool use) |
| `result` | `{ type: "result", subtype: "success", result: "full text", is_error: false, duration_ms: ... }` | Final output — replaces accumulated assistant text |

The `result` event always appears last and contains the complete output as a string in `result`. The code uses this to replace any partial text accumulated from `assistant` events.

## Output Storage

Agent output is persisted in two places:

1. **Ticket metadata** — `ticket.metadata._workflowOutput[nodeId]` (max 10KB, via `persistNodeOutput` in `executor.ts`)
2. **Filesystem** — `.xflow/runs/{runId}/output.md` (full output) and `context.md` (input sent to agent)

## Data Flow

```
executeClaudeAgent (agent.ts)
  → spawns claude CLI, streams stdout
  → emits AGENT_STARTED, AGENT_OUTPUT (per stream event), AGENT_COMPLETED events
  → returns outputText string
      ↓
compiler.ts onDone actions
  → saves to context.nodeOutputs (for downstream interpolation)
  → persistNodeOutput → ticket.metadata._workflowOutput[nodeId]
  → notifyBoardChanged → frontend receives boardUpdated
      ↓
compiler.ts onError actions (if agent throws)
  → persists "[Error] <message>" as workflow output
  → notifyBoardChanged
```

## Error Scenarios

| Scenario | Behavior |
|----------|----------|
| CLI not found | Bun.spawn throws → onError persists error |
| CLI exits non-zero with no output | Throws with stderr content → onError persists error |
| CLI exits non-zero with partial output | Returns partial output (no throw) |
| Timeout | Kills process, throws → onError persists error |
| Empty output (success) | Persists "" → UI shows "(no output)" |

## Timeouts

- Default: 10 minutes (600,000ms)
- Configurable per node in the workflow editor (displayed in seconds)
- Stored as `timeoutMs` in the node config
