# Ticket Metadata & Data Flow

> How, where, and when ticket metadata is captured across the XFlow lifecycle.

---

## Principles

1. **Write at lifecycle boundaries** — the ticket row updates only on lane transitions, run starts, run ends, and errors. Never on fast intermediate node completions.
2. **Derive granular data on read** — per-node timing and progress are queried from `run_events` when needed, not denormalized onto the ticket.
3. **Lane history lives in events** — the ticket's journey across the board is reconstructed from `LANE_ENTERED` / `LANE_EXITED` events, not stored as a growing array.

---

## Storage Strategy

### Stored on `tickets` table

Properties written directly to the ticket row at well-defined moments.

| Property | Type | Updated when | Description |
|---|---|---|---|
| `laneEnteredAt` | `text` (ISO timestamp) | Ticket moves to a new lane | Timestamp of entry into the current lane |
| `runCount` | `integer` | Workflow run starts | Total number of workflow runs triggered for this ticket |
| `agentRunCount` | `integer` | Agent node starts | Number of Claude Code invocations across all runs |
| `retryCount` | `integer` | User retries an interrupted node | Times a node was retried from interrupted state |
| `abortCount` | `integer` | User aborts a run | Times a run was aborted before completion |
| `lastErrorMessage` | `text` | Run fails or is interrupted | Error context from the most recent failure |

`laneEnteredAt` is a dedicated column (frequently used for sorting/filtering). The counters and `lastErrorMessage` live in the `metadata` JSON column.

### Derived on read (from `run_events` / `workflow_runs`)

Properties computed by querying existing tables. Never persisted on the ticket itself.

| Property | Derived from | Query pattern |
|---|---|---|
| `lastCompletedNodeId` | Latest `NODE_COMPLETED` event for the ticket's active run | `run_events WHERE runId = activeRun ORDER BY timestamp DESC LIMIT 1` |
| `totalRunDurationMs` | `startedAt` / `finishedAt` on `workflow_runs` | Sum of `(finishedAt - startedAt)` across all runs for the ticket |
| `totalAgentDurationMs` | `AGENT_STARTED` / `AGENT_COMPLETED` event pairs | Pair matching on `run_events` by node ID |
| `lastAgentOutput` | Latest `AGENT_OUTPUT` event payload | `run_events WHERE type = 'AGENT_OUTPUT' ORDER BY timestamp DESC LIMIT 1` |
| `laneHistory` | `LANE_ENTERED` / `LANE_EXITED` events | `run_events WHERE ticketId = ? AND type IN ('LANE_ENTERED', 'LANE_EXITED')` |
| `laneElapsedMs` | `laneEnteredAt` vs current time (or `LANE_EXITED` timestamp) | Computed in application code |

---

## Event Types

New event types added to `run_events` to support metadata derivation.

| Event type | Payload | Emitted when |
|---|---|---|
| `LANE_ENTERED` | `{ laneId, laneName, timestamp }` | Ticket moves into a lane |
| `LANE_EXITED` | `{ laneId, laneName, timestamp }` | Ticket leaves a lane |
| `AGENT_STARTED` | `{ nodeId }` | Claude Code agent node begins execution |
| `AGENT_COMPLETED` | `{ nodeId, durationMs }` | Claude Code agent node finishes |
| `AGENT_OUTPUT` | `{ nodeId, summary }` | Agent produces output (captured from `output.md`) |

These join existing events (`NODE_STARTED`, `NODE_COMPLETED`, `RUN_STARTED`, `RUN_COMPLETED`, etc.).

---

## Data Flow

### Ticket enters a lane

```
User drags ticket / "Move to Lane" node fires
  |
  +--> Update ticket.laneId, ticket.laneEnteredAt
  +--> Insert LANE_EXITED event (previous lane)
  +--> Insert LANE_ENTERED event (new lane)
  +--> If lane has workflow: start run
         |
         +--> Increment ticket.runCount (in metadata JSON)
         +--> Insert RUN_STARTED event
```

### Workflow node completes

```
XState actor transitions to next state
  |
  +--> Insert NODE_COMPLETED event (to run_events)
  +--> Persist actor snapshot (to workflow_runs.actorSnapshot)
  |
  (ticket row is NOT updated — data is derived from events)
```

### Agent node executes

```
Claude Code agent spawned
  |
  +--> Increment ticket.agentRunCount (in metadata JSON)
  +--> Insert AGENT_STARTED event
  |
  ... agent runs ...
  |
  +--> Capture output to runs/<run-id>/output.md
  +--> Insert AGENT_COMPLETED event (with durationMs)
  +--> Insert AGENT_OUTPUT event (with summary)
```

### Run fails or is interrupted

```
Node throws / app closes mid-run
  |
  +--> Set ticket.lastErrorMessage (in metadata JSON)
  +--> workflow_runs.status = "interrupted" / "error"
  +--> Insert NODE_INTERRUPTED or RUN_FAILED event
```

### User retries or aborts

```
Retry:
  +--> Increment ticket.retryCount (in metadata JSON)
  +--> Re-execute interrupted node from scratch

Abort:
  +--> Increment ticket.abortCount (in metadata JSON)
  +--> workflow_runs.status = "aborted"
  +--> Ticket stays in current lane
```

---

## Query Examples

**Cycle time for current lane:**
```ts
const elapsed = Date.now() - new Date(ticket.laneEnteredAt).getTime();
```

**Full lane history for a ticket:**
```sql
SELECT type, payload FROM run_events
WHERE run_id IN (SELECT id FROM workflow_runs WHERE ticket_id = ?)
  AND type IN ('LANE_ENTERED', 'LANE_EXITED')
ORDER BY timestamp ASC;
```

**Total agent time for a ticket:**
```sql
SELECT SUM(json_extract(payload, '$.durationMs')) FROM run_events
WHERE run_id IN (SELECT id FROM workflow_runs WHERE ticket_id = ?)
  AND type = 'AGENT_COMPLETED';
```

**Tickets stuck in a lane for over 24 hours:**
```sql
SELECT * FROM tickets
WHERE lane_entered_at < datetime('now', '-24 hours');
```
