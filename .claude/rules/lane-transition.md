## Lane Transitions

### Single entry point

All ticket lane transitions — whether from drag-and-drop, a `moveToLane` workflow node, or any future mechanism — must go through `transitionTicketToLane()` in `src/bun/engine/lane-transition.ts`.

Never assemble the steps (DB move, lane events, workflow trigger) ad hoc. The centralized function ensures consistent behavior across all code paths.

### What the function does

1. Moves the ticket in the DB
2. Emits `LANE_EXITED` / `LANE_ENTERED` events on any active run (audit trail)
3. Notifies the frontend
4. Triggers the destination lane's workflow (if one is attached)

### Workflow triggering is the lane's responsibility

The `moveToLane` node moves the ticket — it does not trigger workflows. Workflow triggering happens as a side effect of entering a lane, handled by `triggerWorkflowIfAttached()` inside the centralized function.

This means:
- The `moveToLane` node is a thin wrapper that calls `transitionTicketToLane` and continues
- The calling workflow finishes naturally (reaches its `end` node with status `"done"`)
- The destination lane's workflow starts concurrently

### The `callingRunId` parameter

When a workflow's own `moveToLane` node triggers a lane transition, the current run's ID is passed as `callingRunId`. This prevents `triggerWorkflowIfAttached` from aborting the workflow that initiated the move.

- **RPC (drag-and-drop):** `callingRunId` is omitted — all active runs are fair game for abort
- **moveToLane node:** `callingRunId` is set to the current `runId` — the running workflow is protected
