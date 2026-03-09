# Workflow Nodes

Every workflow is a directed graph of nodes connected by edges. A ticket entering a lane with an attached workflow triggers a run that executes nodes sequentially, following edge transitions.

---

## Start (`start`)

Entry point of every workflow. Receives the ticket context (title, description, metadata) and passes it downstream. Every workflow must have exactly one Start node.

**Config:** none

---

## End (`end`)

Terminal node that marks the run as complete. A workflow must have at least one End node. Multiple End nodes are allowed for different completion paths.

**Config:** none

---

## Claude Agent (`claudeAgent`)

Spawns a Claude Code CLI process with the project root as the working directory. The ticket context is written to `runs/<run-id>/context.md` and passed as input; agent output is captured to `output.md`.

**Config:**
- `prompt` — instruction prepended to the ticket context
- `timeoutMs` — max execution time (default: 600 000 ms)
- `includeWorkflowOutput` — whether to include output from prior nodes

**Emits:** `AGENT_DONE` on completion

---

## Custom Script (`customScript`)

Runs an arbitrary script in the project root.

**Config:**
- `script` — the script body to execute
- `interpreter` — `"bun"` or `"sh"` (default: `"bun"`)
- `timeoutMs` — max execution time (default: 30 000 ms)

---

## Notify (`notify`)

Sends a native desktop notification via Electrobun.

**Config:**
- `title` — notification title (supports `{{ticket.title}}` interpolation)
- `body` — notification body

---

## Wait for Approval (`waitForApproval`)

Pauses the workflow and surfaces an approve/reject action in the ticket detail UI. On app restart, waiting nodes are automatically restored to their paused state.

**Config:**
- `message` — prompt shown to the reviewer

**Emits:** `APPROVED` or `REJECTED`

---

## Move to Lane (`moveToLane`)

Advances the ticket to a different lane on the board. If the destination lane has its own workflow, that workflow is triggered in turn.

**Config:**
- `laneId` — target lane ID
- `laneName` — target lane display name

---

## Condition (`condition`)

Routes the flow along one of two edges based on evaluating an expression against the ticket context and prior node outputs.

**Config:**
- `expression` — expression evaluated at runtime

**Emits:** `TRUE` or `FALSE`

---

## Set Metadata (`setMetadata`)

Writes a key-value pair onto the ticket's metadata JSON. Useful for passing data between nodes or tagging tickets with computed values.

**Config:**
- `key` — metadata key
- `value` — metadata value (supports `{{agentOutput}}` interpolation)

---

## Log (`log`)

Appends a message to the ticket's run history. Useful for debugging and audit trails.

**Config:**
- `message` — the message to log
