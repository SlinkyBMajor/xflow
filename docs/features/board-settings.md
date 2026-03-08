# Board Settings & Worktree UI

## Purpose

Board-level defaults for worktree isolation and merge strategy, plus UI components for viewing worktree status and resolving merge conflicts.

## Board Settings

### Schema

Migration `0004_sturdy_bloodstorm.sql`:
```sql
ALTER TABLE boards ADD settings text;
```

The `settings` column stores JSON:
```ts
interface BoardSettings {
  defaultWorktreeEnabled?: boolean;
  defaultMergeStrategy?: MergeStrategy;
  defaultBaseBranch?: string;
}
```

### Access

- **Read**: `boardQueries.getFirstBoard(db)` parses `settings` JSON via `rowToBoard`
- **Write**: `boardQueries.updateBoardSettings(db, boardId, settings)`
- **RPC**: `updateBoardSettings({ settings })` — returns the updated `Board`

### UI

The settings gear icon in `BoardHeader.tsx` opens `BoardSettingsModal.tsx`:
- Toggle: "Enable worktree isolation by default"
- Dropdown: Default merge strategy (auto/pr/manual)
- Input: Default base branch (optional)

Node-level config in `NodeConfigPanel.tsx` overrides board defaults when set.

## Worktree Status Component

`src/mainview/components/ticket/WorktreeStatus.tsx` appears in `TicketDetailModal` right sidebar when a run has worktree data.

### Status badges

| State | Condition | Style |
|-------|-----------|-------|
| Active | Run is still running | Yellow |
| Merged | No worktree path (already cleaned up) | Green |
| Conflict | Merge returned `conflicted: true` | Red |
| Pending | Run done, worktree still exists | Blue |

### Actions

- **Branch name** — Click to copy to clipboard
- **View Diff** — Calls `getWorktreeDiff` RPC, shows in a `<pre>` block
- **Merge** — Calls `mergeWorktreeBranch` with `auto` strategy
- **Create PR** — Calls `mergeWorktreeBranch` with `pr` strategy
- **Cleanup** — Calls `cleanupWorktree` to remove worktree and branch

## Merge Conflict Panel

`src/mainview/components/ticket/MergeConflictPanel.tsx` is shown when a merge attempt returns conflicts.

- Lists conflicted files
- "Retry Merge" button — re-attempts auto-merge after user resolves conflicts in terminal
- "Abort & Cleanup" button — removes the worktree entirely

## Workflow Editor Visual

`ClaudeAgentNode.tsx` shows a small `GitBranch` icon (from lucide-react) when `worktreeEnabled` is true in the node config, making isolation visible at a glance in the workflow canvas.

## Key Files

| File | Role |
|------|------|
| `src/bun/db/schema.ts` | `settings` column on `boards` |
| `src/bun/db/queries/boards.ts` | `rowToBoard`, `updateBoardSettings` |
| `src/shared/types.ts` | `BoardSettings`, `MergeResult` types, RPC endpoints |
| `src/bun/rpc.ts` | `updateBoardSettings` handler |
| `src/mainview/components/board/BoardSettingsModal.tsx` | Board defaults modal |
| `src/mainview/components/board/BoardHeader.tsx` | Settings button |
| `src/mainview/components/board/BoardView.tsx` | Wires modal to header |
| `src/mainview/components/ticket/WorktreeStatus.tsx` | Worktree status + actions |
| `src/mainview/components/ticket/MergeConflictPanel.tsx` | Conflict resolution UI |
| `src/mainview/components/ticket/TicketDetailModal.tsx` | Integrates WorktreeStatus |
| `src/mainview/components/workflow/nodes/ClaudeAgentNode.tsx` | Git branch icon |
