# Git Merge Strategies

## Purpose

After an agent finishes working in a worktree, the resulting branch needs to be handled. XFlow supports three strategies: auto-merge, create PR, and manual.

## Strategies

### `auto`

Merges the worktree branch into the base branch using `git merge --no-ff`. On success, the worktree is automatically cleaned up.

If conflicts are detected:
1. The merge is aborted (`git merge --abort`)
2. A `WORKTREE_MERGE` event is emitted with `conflicted: true` and the list of conflicted files
3. The worktree and branch are left intact for manual resolution

### `pr`

Pushes the branch to `origin` and creates a pull request via `gh pr create --head <branch> --fill`. Returns the PR URL in the `MergeResult`. The worktree is cleaned up but the branch is preserved on the remote.

### `manual`

Does nothing — the worktree and branch are left for the user to handle via terminal. A `WORKTREE_READY` event is emitted with the path and branch name.

## Post-Execution Flow

In `src/bun/engine/agent.ts`, after `executeClaudeAgent` succeeds:

```
agent completes
  → worktreeHasChanges(worktreePath)?
    → no changes: removeWorktree, emit WORKTREE_CLEANUP
    → has changes + strategy "auto": mergeWorktreeBranch → emit WORKTREE_MERGE
      → success: removeWorktree, clear run's worktree fields
      → conflict: leave worktree, emit conflict details
    → has changes + strategy "pr" or "manual": emit WORKTREE_READY
```

## RPC Endpoints

Users can also trigger merge/cleanup manually from the UI:

| RPC Method | Purpose |
|------------|---------|
| `mergeWorktreeBranch` | Merge a run's branch with a given strategy |
| `getWorktreeDiff` | Get the diff of changes in a run's worktree |
| `cleanupWorktree` | Remove a run's worktree and branch |

## Configuration

In `ClaudeAgentConfig`:
```ts
mergeStrategy?: "auto" | "pr" | "manual";  // default: "manual"
baseBranch?: string;                         // default: current branch at run start
```

Set per-node in `NodeConfigPanel.tsx` (visible when worktree is enabled), or as board-level defaults in `BoardSettingsModal.tsx`.

## Key Files

| File | Role |
|------|------|
| `src/bun/git/merge.ts` | `mergeWorktreeBranch`, `getWorktreeDiff` |
| `src/bun/git/worktree.ts` | `worktreeHasChanges`, `removeWorktree` |
| `src/bun/engine/agent.ts` | Post-execution merge logic |
| `src/bun/rpc.ts` | RPC handlers for manual merge/diff/cleanup |

## Types

```ts
type MergeStrategy = "auto" | "pr" | "manual";

interface MergeResult {
  success: boolean;
  strategy: MergeStrategy;
  conflicted: boolean;
  conflictFiles?: string[];
  prUrl?: string;
  error?: string;
}
```
