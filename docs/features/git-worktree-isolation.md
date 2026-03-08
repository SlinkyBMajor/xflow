# Git Worktree Isolation

## Purpose

When multiple tickets trigger Claude Agent nodes concurrently, all agents share the same working directory — causing race conditions and merge conflicts. Worktree isolation gives each agent run its own git worktree so they can modify files independently.

## How It Works

Enable "Use git worktree" on a Claude Agent node in the workflow editor (`NodeConfigPanel.tsx`). When the agent executes:

1. XFlow checks if the project is a git repo (`isGitRepo`)
2. Creates a new worktree at `.xflow/worktrees/<runId>/` on branch `xflow/<ticketId-8>-<runId-8>`
3. The `Bun.spawn` CWD is set to the worktree path instead of the project root
4. Run artifacts (`context.md`, `output.md`) still go to `.xflow/runs/<runId>/` in the main tree

## Key Files

| File | Role |
|------|------|
| `src/bun/git/worktree.ts` | Core git operations: create, remove, prune, check changes |
| `src/bun/engine/agent.ts` | Creates worktree before spawn, handles post-execution merge |
| `src/bun/engine/runner.ts` | Cleans up worktrees on abort |
| `src/bun/project/open.ts` | Scaffolds `.xflow/worktrees/`, prunes orphans on project open |
| `src/bun/db/schema.ts` | `worktree_path` and `worktree_branch` columns on `workflow_runs` |

## Worktree Lifecycle

```
Agent node starts (worktreeEnabled: true)
  → isGitRepo(projectPath)
  → createWorktree(projectPath, runId, ticketId)
  → WORKTREE_CREATED event emitted
  → agent runs with cwd = worktreePath
  → agent completes
  → post-execution merge (see git-merge-strategies.md)
```

On abort: `removeWorktree` is called, which runs `git worktree remove --force` then `git branch -d`.

On project open: `pruneOrphanedWorktrees` scans `.xflow/worktrees/` and removes any directories whose run ID is not in the active runs list, then runs `git worktree prune`.

## Schema

Migration `0003_sour_skaar.sql`:
```sql
ALTER TABLE workflow_runs ADD worktree_path text;
ALTER TABLE workflow_runs ADD worktree_branch text;
```

## Configuration

In `ClaudeAgentConfig` (`src/shared/types.ts`):
```ts
worktreeEnabled?: boolean;
mergeStrategy?: "auto" | "pr" | "manual";
baseBranch?: string;
```

The UI checkbox and merge options appear in `NodeConfigPanel.tsx` under the Claude Agent section. Board-level defaults can be set via the Board Settings modal.

## .gitignore

On first project scaffold, `.xflow/` is appended to the project's `.gitignore` if not already present. This ensures worktrees inside `.xflow/worktrees/` don't appear as nested repos.
