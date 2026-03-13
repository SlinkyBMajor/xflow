# Workflow Runs

A **workflow run** is a single execution of a workflow against a ticket. When a ticket enters a lane with an attached workflow, a run is created and the XState actor walks the node graph. The run record tracks execution state, worktree info, and merge results throughout the lifecycle.

## Schema

Table: `workflow_runs`

| Column | Type | Description |
|--------|------|-------------|
| `id` | text (PK) | UUID generated at run start |
| `ticket_id` | text (FK → tickets) | The ticket this run belongs to |
| `workflow_id` | text (FK → workflows) | The workflow definition being executed |
| `actor_snapshot` | text (JSON) | Serialized XState actor state, updated on each node transition |
| `current_node_id` | text | The node currently being executed (null when done) |
| `node_status` | text | `"running"` or `"completed"` or `"interrupted"` |
| `status` | text | `"active"`, `"done"`, or `"aborted"` |
| `started_at` | text (ISO 8601) | When the run began |
| `finished_at` | text (ISO 8601) | When the run completed or was aborted (null while active) |
| `last_checkpoint_at` | text (ISO 8601) | Last state transition timestamp, used for recovery |
| `worktree_path` | text | Filesystem path to the git worktree (null if none or cleaned up) |
| `worktree_branch` | text | Branch name in the worktree (null if none) |
| `merge_result` | text (JSON) | `MergeResult` from a PR creation or merge operation |

## Lifecycle

```
startRun()          → status: "active",  nodeStatus: "running"
  ↓
node transitions    → currentNodeId updated, actorSnapshot checkpointed
  ↓
actor "done"        → status: "done",    nodeStatus: "completed", finishedAt set
actor "error"       → status: "aborted", nodeStatus: "interrupted", finishedAt set
abortRun()          → status: "aborted", nodeStatus: "interrupted", finishedAt set
```

On resume (`resumeRun`), the run restarts from `currentNodeId` with a fresh XState actor.

## Worktree fields

When a Claude Agent node has `worktreeEnabled: true`, the agent creates (or reuses) a git worktree and writes the path and branch to the run record:

```
runQueries.updateRun(db, runId, { worktreePath, worktreeBranch })
```

Downstream nodes in the same run (e.g., `gitAction:createPr`) read these fields to operate on the worktree branch. After a PR is merged or the worktree is cleaned up, `worktreePath` is set to null.

### Worktree reuse across runs

If a ticket already has a worktree from a previous run, the new run reuses it rather than creating a fresh one. The worktree reference is transferred from the old run to the new one.

## Merge result

The `merge_result` column stores a `MergeResult` JSON object, written by:

- `gitAction:createPr` — after successfully creating a PR
- `gitAction:mergePr` — sets `prMerged: true`
- The PR poller — sets `prMerged: true` when it detects an externally merged PR

```ts
interface MergeResult {
  success: boolean;
  strategy: MergeStrategy;    // "auto" | "pr" | "manual"
  conflicted: boolean;
  conflictFiles?: string[];
  prUrl?: string;
  prNumber?: number;
  prMerged?: boolean;
  error?: string;
}
```

The PR poller (`src/bun/git/pr-poller.ts`) watches for runs where `mergeResult.prUrl` exists and `prMerged` is falsy, checking the PR status every 60 seconds.

## Run events

Each run emits events to the `run_events` table via `insertAndEmit()`. Events are streamed to the frontend in real time and rendered in the output panel (CMD+J). See [nodes.md](nodes.md) for event types per node.

## Key files

| File | Role |
|------|------|
| `src/bun/db/schema.ts` | `workflow_runs` table definition |
| `src/bun/db/queries/runs.ts` | CRUD operations: `createRun`, `getRunById`, `updateRun`, `getRunsWithWorktrees` |
| `src/bun/engine/runner.ts` | `startRun`, `resumeRun`, `abortRun` — creates XState actors and manages the run lifecycle |
| `src/bun/engine/compiler.ts` | Compiles workflow IR into an XState machine; nodes read/write run state |
| `src/bun/git/pr-poller.ts` | Polls open PRs referenced in `mergeResult` |
| `src/shared/types.ts` | `WorkflowRun`, `MergeResult` TypeScript interfaces |
