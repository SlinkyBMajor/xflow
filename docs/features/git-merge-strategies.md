# Git Merge Strategies

## Purpose

When a worktree branch has changes, XFlow supports two merge strategies: direct merge and create PR. These are used by the `gitAction` workflow node and the manual worktree panel in the ticket modal.

## Strategies

### `direct`

Merges the worktree branch into the base branch using `git merge --no-ff`. On success, the worktree is automatically cleaned up.

If conflicts are detected:
1. The merge is aborted (`git merge --abort`)
2. The result includes `conflicted: true` and the list of conflicted files
3. The worktree and branch are left intact for manual resolution

### `pr`

Pushes the branch to `origin` and creates a pull request via `gh pr create`. Returns the PR URL in the `MergeResult`. The worktree is preserved until the PR is merged (detected by the PR poller or manually marked).

## Where strategies are used

### Workflow nodes (`gitAction`)

The `gitAction` node uses `"pr"` strategy exclusively:
- `createPr` — calls `mergeWorktreeBranch(..., "pr", ...)` to push and open a PR
- The `addReviewer` and `mergePr` actions operate on the PR after creation

### Manual worktree panel (ticket modal)

The worktree status panel offers both strategies as buttons:
- **Merge** — calls `mergeWorktreeBranch` with `"direct"` strategy
- **Create PR** — calls `mergeWorktreeBranch` with `"pr"` strategy
- **Retry Merge** (conflict state) — retries with `"direct"` strategy
- **Cleanup** — removes the worktree without merging

## Post-Execution Flow

In `src/bun/engine/agent.ts`, after `executeClaudeAgent` succeeds:

```
agent completes
  → worktreeHasChanges(worktreePath)?
    → no changes: removeWorktree, emit WORKTREE_CLEANUP
    → has changes: emit WORKTREE_READY (for downstream gitAction nodes or manual handling)
```

The agent node no longer merges — that responsibility belongs to downstream `gitAction` nodes or the manual worktree panel.

## RPC Endpoints

| RPC Method | Purpose |
|------------|---------|
| `mergeWorktreeBranch` | Merge a run's branch with a given strategy (`direct` or `pr`) |
| `getWorktreeDiff` | Get the diff of changes in a run's worktree |
| `cleanupWorktree` | Remove a run's worktree and branch |

## Types

```ts
interface MergeResult {
  success: boolean;
  conflicted: boolean;
  conflictFiles?: string[];
  prUrl?: string;
  prNumber?: number;
  prMerged?: boolean;
  error?: string;
}
```

The presence of `prUrl` indicates a PR was created. Its absence means a direct merge. No explicit strategy field is needed — the data speaks for itself.

## Key Files

| File | Role |
|------|------|
| `src/bun/git/merge.ts` | `directMerge`, `createPR`, `getWorktreeDiff` |
| `src/bun/git/worktree.ts` | `worktreeHasChanges`, `removeWorktree` |
| `src/bun/engine/git-action.ts` | `gitAction` node executor (calls `createPR`) |
| `src/bun/rpc.ts` | RPC handlers for manual merge/diff/cleanup |
| `src/mainview/components/ticket/WorktreeStatus.tsx` | Manual merge UI |
| `src/mainview/components/ticket/MergeConflictPanel.tsx` | Conflict resolution UI |
