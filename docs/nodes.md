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
- `worktreeEnabled` — run in an isolated git worktree (changes are left for downstream gitAction nodes)

**Emits:** `AGENT_DONE` on completion, `WORKTREE_READY` if worktree has changes

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

**Available scope variables:**
- `ticket` — full ticket object
- `title`, `body`, `tags` — ticket fields
- `metadata` — ticket metadata object
- `outputs` — node results keyed by node ID, each a `{ status, output }` object. `status` is `"success"`, `"error"`, or `"timeout"`. Example: `outputs["node-id"]?.status === "success"`

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

---

## Git Action (`gitAction`)

Performs Git/GitHub operations as composable workflow steps. Use downstream of a Claude Agent node (with worktree enabled) to create PRs, add reviewers, or merge.

### `createPr`

Creates a pull request from the worktree branch.

**Config:**
- `baseBranch` — target branch (defaults to current branch)
- `prTitle` — PR title (defaults to ticket title, supports interpolation)
- `prBody` — PR body (defaults to ticket description + commit log, supports interpolation)

**Output:** `{ prUrl, prNumber, branch }` — also written to ticket metadata as `prUrl`, `prNumber`, `branch`.

### `addReviewer`

Adds a reviewer to an existing pull request.

**Config:**
- `prNumber` — PR number (use `{{ticketMetadata.prNumber}}` to reference upstream createPr)
- `reviewer` — GitHub username

**Output:** `{ success, prNumber, reviewer }`

### `mergePr`

Merges a pull request and cleans up the worktree.

**Config:**
- `prNumber` — PR number (use `{{ticketMetadata.prNumber}}` to reference upstream createPr)
- `mergeMethod` — `squash`, `merge`, or `rebase` (default: `squash`)

**Output:** `{ merged, prNumber, mergeMethod }`

**Events:** `GIT_ACTION_STARTED`, `GIT_ACTION_PR_CREATED`, `GIT_ACTION_REVIEWER_ADDED`, `GIT_ACTION_PR_MERGED`
