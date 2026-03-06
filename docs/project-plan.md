# XFlow — Project Plan
> An agentic Kanban board with configurable lane-level workflow engines, built on Electrobun, XState, and React Flow.

---

## Vision

KanbanFlow is a desktop-native Kanban application where each board lane can have an attached **workflow** — a visual, node-based state machine that automatically executes when a ticket enters the lane. Workflows can spawn AI agents (e.g. Claude Code), call external tools, wait for human review, and automatically advance tickets through the board. The result is a semi-autonomous project management tool where humans define the process and agents do the work.

---

## Core Concepts

| Concept | Description |
|---|---|
| **Board** | A collection of ordered lanes, each with tickets |
| **Lane** | A column on the board; has a name, order, and an optional Workflow |
| **Ticket** | A unit of work with title, description, metadata, and state history |
| **Workflow** | An XState state machine, visually authored in React Flow, attached to a lane |
| **Workflow Node** | A single step in a workflow (e.g. spawn agent, send notification, wait, condition) |
| **Agent** | An XState actor spawned by a workflow node, capable of running Claude Code or other tools |
| **Run** | A single execution of a workflow triggered by a ticket entering a lane |

---

## Tech Stack

| Layer | Technology | Role |
|---|---|---|
| Desktop shell | **Electrobun** | Native desktop app (macOS-first), IPC, file system, process spawning |
| UI framework | **React** + **TypeScript** | Component rendering |
| Workflow UI | **React Flow** | Visual node-based workflow editor |
| State machines | **XState v5** | Workflow engine, agent actor system |
| Styling | **Tailwind CSS** | UI styling |
| Persistence | **SQLite** via **Drizzle ORM** + `bun:sqlite` | Boards, lanes, tickets, workflow definitions, run history |
| Agent runtime | **Claude Code CLI** | AI agent execution, spawned as child processes |
| Notifications | **Electrobun native APIs** | System-level notifications for human-review steps |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                  Electrobun Shell               │
│  ┌──────────────────────────────────────────┐  │
│  │              React UI                    │  │
│  │  ┌────────────┐  ┌─────────────────────┐ │  │
│  │  │ Kanban     │  │ Workflow Editor      │ │  │
│  │  │ Board View │  │ (React Flow)         │ │  │
│  │  └────────────┘  └─────────────────────┘ │  │
│  └──────────────┬───────────────────────────┘  │
│                 │ IPC                           │
│  ┌──────────────▼───────────────────────────┐  │
│  │           Bun Backend                    │  │
│  │  ┌─────────────┐  ┌────────────────────┐ │  │
│  │  │  XState     │  │  SQLite DB         │ │  │
│  │  │  Actor Sys  │  │  (persistence)     │ │  │
│  │  └──────┬──────┘  └────────────────────┘ │  │
│  │         │ spawn                           │  │
│  │  ┌──────▼──────────────────────────────┐ │  │
│  │  │   Claude Code CLI / Other Agents    │ │  │
│  │  └─────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## Feature Breakdown

### 1. Board & Lane Management
- Create/edit/delete boards
- Create/edit/delete/reorder lanes
- Drag-and-drop tickets between lanes (triggers workflow)
- Lane settings panel (name, color, WIP limits, attached workflow)

### 2. Ticket Management
- Create/edit tickets (title, description, markdown body, tags, assignee)
- Ticket detail drawer/modal
- Ticket history log (state transitions, workflow run events)
- Ticket metadata (created at, updated at, current lane, current run)

### 3. Workflow Editor (React Flow)
- Visual canvas for building lane workflows
- Node palette with built-in node types (see below)
- Connect nodes with edges representing transitions
- Save workflow as JSON (XState config) attached to a lane
- Live preview of active workflow runs on the canvas

### 4. Workflow Engine (XState)
- On ticket lane transition → instantiate an XState actor from the lane's workflow config
- Each actor tracks: current state, ticket context, run log
- Actors persist their state to SQLite (survive app restarts)
- Actor lifecycle: created → running → (paused for human) → done / error

### 5. Agent Integration
- Workflow node type: **Claude Code Agent**
  - Spawns `claude-code` CLI as a child process via Electrobun/Bun
  - Passes ticket context (title, description, prior outputs) as input
  - Streams output back to the run log
  - On completion, emits event to the XState actor to advance the workflow
- Future: support other agent types (web search, custom scripts, API calls)

### 6. Notifications & Human-in-the-Loop
- **Notify node**: sends a native desktop notification with ticket summary
- **Wait for approval node**: pauses the workflow, surfaces an action in the UI (approve / reject / edit)
- Approval/rejection emits events back to the XState actor

### 7. Automatic Lane Advancement
- Workflow nodes can emit a **"move ticket to lane X"** action
- This triggers the destination lane's workflow in turn
- Creates a chain of automated processing across the board

---

## Built-in Workflow Node Types

| Node | Description |
|---|---|
| **Start** | Entry point; receives ticket context |
| **Claude Code Agent** | Spawns Claude Code CLI with ticket as prompt context |
| **Custom Script** | Runs an arbitrary Bun/shell script |
| **Notify** | Sends a desktop notification |
| **Wait for Approval** | Pauses; resumes on human approve/reject in UI |
| **Move to Lane** | Advances ticket to a named lane on the board |
| **Condition / Branch** | Routes flow based on ticket metadata or prior node output |
| **Set Metadata** | Writes key-value data onto the ticket |
| **Log** | Appends a message to the ticket's run history |
| **End** | Terminal state; marks run as complete |

---

## Data Model (Draft)

```
Board        { id, name, createdAt }
Lane         { id, boardId, name, order, color, wipLimit, workflowId }
Workflow     { id, name, definition: JSON (XState config + React Flow layout) }
Ticket       { id, boardId, laneId, title, body, tags, metadata: JSON, createdAt, updatedAt }
WorkflowRun  { id, ticketId, workflowId, actorState: JSON, status, startedAt, finishedAt }
RunEvent     { id, runId, type, payload: JSON, timestamp }
```

---

## Phased Roadmap

### Phase 1 — Foundation
- [ ] Electrobun project scaffold (Bun backend + React frontend)
- [ ] Drizzle ORM + `bun:sqlite` setup with migration system
- [ ] SQLite schema: boards, lanes, tickets, workflows, runs, events
- [ ] Project directory open flow — native file picker, `.xflow/` scaffold on first open
- [ ] Recent projects list (`~/.config/xflow/recents.json`)
- [ ] Basic board/lane/ticket CRUD (Drizzle queries)
- [ ] Drag-and-drop Kanban UI (no workflows yet)
- [ ] Multiple project windows (one Electrobun window per project)

### Phase 2 — Workflow Editor
- [ ] React Flow canvas integrated into Electrobun window
- [ ] IR schema implementation (`WorkflowIR`, `IRNode`, `IREdge` types)
- [ ] Node palette + drag-onto-canvas for all built-in node types
- [ ] Edge connections + validation
- [ ] Per-node config panels (settings sidebar)
- [ ] Save/load workflow IR JSON to SQLite per lane (`workflows` table)

### Phase 3 — Workflow Engine
- [ ] IR → XState compiler (`compileWorkflow` function)
- [ ] IR → React Flow loader (`loadWorkflow` function)
- [ ] XState actor instantiation from compiled machine on ticket lane transition
- [ ] Ticket context passed into actor
- [ ] Actor snapshot persistence to SQLite after each node completes
- [ ] Basic node execution: Start, Log, Set Metadata, Move to Lane, End

### Phase 4 — Run Resumption
- [ ] `state.json` written per run to `.xflow/runs/<run-id>/`
- [ ] On app startup: scan for interrupted runs, surface in Interrupted Runs panel
- [ ] Retry interrupted node from scratch
- [ ] Abort run — ticket stays in current lane, run marked aborted
- [ ] Wait-for-approval node auto-restored on restart

### Phase 5 — Agent Integration
- [ ] Claude Code node: spawn CLI process with project root as working directory
- [ ] Ticket context written to `.xflow/runs/<run-id>/context.md` before spawn
- [ ] Agent output captured to `.xflow/runs/<run-id>/output.md`
- [ ] Run events streamed to SQLite (`run_events` table) and live UI via IPC
- [ ] Wait for Approval node + UI actions (approve / retry)
- [ ] Notify node (native desktop notification via Electrobun)
- [ ] Condition/branch node

### Phase 6 — Polish & Power Features
- [ ] Live workflow run visualisation on React Flow canvas (highlight active node)
- [ ] Custom script node (Bun/shell)
- [ ] Workflow versioning
- [ ] Board templates

---

## Workflow IR Schema

The Workflow IR is the canonical format stored in SQLite. It is the single source of truth — React Flow reads and writes it for the visual editor, and the XState compiler consumes it at runtime to produce executable machines.

### Top-level shape

```ts
interface WorkflowIR {
  version: 1;
  nodes: IRNode[];
  edges: IREdge[];
}
```

### Nodes

```ts
interface IRNode {
  id: string;                  // stable UUID
  type: IRNodeType;            // see node types below
  position: { x: number; y: number };  // React Flow canvas position
  label?: string;              // display name override
  config: IRNodeConfig;        // type-specific config (see below)
}

type IRNodeType =
  | "start"
  | "end"
  | "claudeAgent"
  | "customScript"
  | "notify"
  | "waitForApproval"
  | "moveToLane"
  | "condition"
  | "setMetadata"
  | "log";
```

### Node configs (per type)

```ts
// claudeAgent
{ prompt: string; timeoutMs?: number; }

// customScript
{ script: string; interpreter?: "bun" | "sh"; }

// notify
{ title: string; body: string; }

// waitForApproval
{ message: string; }
// emits: "APPROVED" | "REJECTED"

// moveToLane
{ laneId: string; laneName: string; }

// condition
{ expression: string; }
// expression is evaluated against ticket context
// emits: "TRUE" | "FALSE"

// setMetadata
{ key: string; value: string; }

// log
{ message: string; }

// start, end — no config needed
```

### Edges

```ts
interface IREdge {
  id: string;
  from: string;        // source node id
  to: string;          // target node id
  on?: string;         // event name that triggers this transition
                       // e.g. "AGENT_DONE", "APPROVED", "TRUE"
                       // if omitted, transition is automatic on node completion
}
```

### Example IR — "Planning" lane workflow

```json
{
  "version": 1,
  "nodes": [
    { "id": "n1", "type": "start",        "position": { "x": 0,   "y": 0   }, "config": {} },
    { "id": "n2", "type": "claudeAgent",  "position": { "x": 200, "y": 0   }, "config": { "prompt": "Plan the task described in this ticket. Output a markdown checklist." } },
    { "id": "n3", "type": "setMetadata",  "position": { "x": 400, "y": 0   }, "config": { "key": "plan", "value": "{{agentOutput}}" } },
    { "id": "n4", "type": "moveToLane",   "position": { "x": 600, "y": 0   }, "config": { "laneId": "lane-review", "laneName": "Plan Review" } },
    { "id": "n5", "type": "notify",       "position": { "x": 800, "y": 0   }, "config": { "title": "Plan Ready", "body": "{{ticket.title}} is ready for review." } },
    { "id": "n6", "type": "end",          "position": { "x": 1000,"y": 0   }, "config": {} }
  ],
  "edges": [
    { "id": "e1", "from": "n1", "to": "n2" },
    { "id": "e2", "from": "n2", "to": "n3", "on": "AGENT_DONE" },
    { "id": "e3", "from": "n3", "to": "n4" },
    { "id": "e4", "from": "n4", "to": "n5" },
    { "id": "e5", "from": "n5", "to": "n6" }
  ]
}
```

### Compiler: IR → XState

A `compileWorkflow(ir: WorkflowIR, ticket: Ticket): AnyStateMachine` function converts the IR into an XState v5 machine at runtime. Each node becomes an XState state; each edge becomes a transition. Node configs are mapped to XState `entry` actions or `invoke` promises/actors depending on type.

### Loader: IR → React Flow

A `loadWorkflow(ir: WorkflowIR): { nodes: RFNode[], edges: RFEdge[] }` function hydrates the React Flow canvas from the IR. Node type maps to a custom React Flow node component; config is passed as `data` props for the settings panel.

---

## Project Directory Model

Each board is anchored to a **local project directory** opened by the user. This is the working directory for all agent processes spawned by that board's workflows.

### Directory structure

```
my-project/                        ← user's existing project root
├── .xflow/                        ← created by XFlow on first open
│   ├── board.json                 ← board + lane config
│   ├── workflows/
│   │   ├── <workflow-id>.json     ← IR JSON per workflow
│   ├── tickets/
│   │   ├── <ticket-id>.json       ← ticket data + metadata
│   ├── runs/
│   │   ├── <run-id>/
│   │   │   ├── context.md         ← ticket context written before agent spawn
│   │   │   ├── output.md          ← agent output captured after run
│   │   │   └── state.json         ← XState actor persisted state
│   └── db.sqlite                  ← run history, events, indexes
└── ... (user's own project files)
```

The `.kanbanflow/` folder is the only thing KanbanFlow adds to the project. Everything else is untouched. Users can `.gitignore` it or commit it — their choice.

### Project open flow

1. User clicks **Open Project** → native directory picker (Electrobun file dialog)
2. App checks for `.kanbanflow/` in the selected directory
   - If found → load existing board, lanes, workflows, tickets
   - If not found → scaffold the `.kanbanflow/` directory and create a blank board
3. Board is now active; all agent spawns use the project root as their working directory
4. Recent projects are stored in app-level config (`~/.config/xflow/recents.json`) for quick re-opening

### Agent working directory

Claude Code agents spawned by a workflow run receive the **project root** as their working directory. This means they can naturally read and write source files, run tests, create branches, etc. — exactly as if a developer had invoked them from the terminal in that project.

The `runs/<run-id>/context.md` file is passed as input context to the agent, and its output is captured to `runs/<run-id>/output.md` before being stored in SQLite and surfaced in the UI.

### Claude Code node config update

```ts
// claudeAgent config (updated)
{
  prompt: string;          // injected before ticket context
  timeoutMs?: number;
  // working directory is always the project root — no sandboxing option needed
}
```

### Multi-board / multi-project

- Each open project window = one board
- Multiple projects can be open simultaneously in separate Electrobun windows
- Each window has its own XState actor system scoped to that project

---

## Open Questions

1. **XState config format** — ~~Should workflows be stored as pure XState v5 machine configs, or as an intermediate IR?~~ **Resolved: IR approach adopted** (see Workflow IR Schema above).
2. **Agent sandboxing** — ~~How isolated should Claude Code agent processes be?~~ **Resolved: agents run in the project root directory** (see Project Directory Model above).
3. **Workflow run resumption** — ~~If the app is closed mid-run, how do we resume in-flight actors on restart?~~ **Resolved: atomic node model adopted** (see Workflow Run Resumption below).

---

## Database — SQLite + Drizzle ORM

XFlow uses **SQLite** via Bun's native `bun:sqlite` module, with **Drizzle ORM** on top for type-safe queries and schema migrations. The database file lives at `.xflow/db.sqlite` inside the project directory.

### Why Drizzle

- Type-safe query builder that stays close to SQL — no magic or heavy abstractions
- Built-in migration system (`drizzle-kit`) that generates SQL migration files
- First-class Bun + SQLite support
- Lightweight — doesn't fight you when you need to drop to raw SQL

### Schema (Drizzle)

```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const boards = sqliteTable("boards", {
  id:        text("id").primaryKey(),
  name:      text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const lanes = sqliteTable("lanes", {
  id:         text("id").primaryKey(),
  boardId:    text("board_id").notNull().references(() => boards.id),
  name:       text("name").notNull(),
  order:      integer("order").notNull(),
  color:      text("color"),
  wipLimit:   integer("wip_limit"),
  workflowId: text("workflow_id").references(() => workflows.id),
});

export const workflows = sqliteTable("workflows", {
  id:         text("id").primaryKey(),
  name:       text("name").notNull(),
  definition: text("definition").notNull(), // WorkflowIR serialised as JSON
  createdAt:  text("created_at").notNull(),
  updatedAt:  text("updated_at").notNull(),
});

export const tickets = sqliteTable("tickets", {
  id:        text("id").primaryKey(),
  boardId:   text("board_id").notNull().references(() => boards.id),
  laneId:    text("lane_id").notNull().references(() => lanes.id),
  title:     text("title").notNull(),
  body:      text("body"),              // markdown
  tags:      text("tags"),             // JSON string array
  metadata:  text("metadata"),         // JSON key-value store
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const workflowRuns = sqliteTable("workflow_runs", {
  id:             text("id").primaryKey(),
  ticketId:       text("ticket_id").notNull().references(() => tickets.id),
  workflowId:     text("workflow_id").notNull().references(() => workflows.id),
  actorSnapshot:  text("actor_snapshot"),  // XState snapshot JSON
  currentNodeId:  text("current_node_id"),
  nodeStatus:     text("node_status").notNull(), // "running" | "completed" | "interrupted"
  status:         text("status").notNull(),      // "active" | "done" | "aborted"
  startedAt:      text("started_at").notNull(),
  finishedAt:     text("finished_at"),
  lastCheckpoint: text("last_checkpoint_at"),
});

export const runEvents = sqliteTable("run_events", {
  id:        text("id").primaryKey(),
  runId:     text("run_id").notNull().references(() => workflowRuns.id),
  type:      text("type").notNull(),   // e.g. "NODE_STARTED", "NODE_COMPLETED", "AGENT_OUTPUT"
  payload:   text("payload"),          // JSON
  timestamp: text("timestamp").notNull(),
});
```

### Migrations

Drizzle Kit manages migrations. Each schema change generates a versioned SQL file in `.xflow/migrations/`:

```
.xflow/
└── migrations/
    ├── 0001_initial.sql
    ├── 0002_add_wip_limit.sql
    └── meta/
        └── _journal.json   ← tracks which migrations have been applied
```

On every app startup, XFlow runs pending migrations automatically before opening the board:

```ts
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { Database } from "bun:sqlite";

const sqlite = new Database(".xflow/db.sqlite");
const db = drizzle(sqlite);

await migrate(db, { migrationsFolder: ".xflow/migrations" });
```

This ensures any existing project database is safely upgraded when the user opens it with a newer version of XFlow.

Nodes are treated as **atomic** — a node either completed or it didn't. XFlow never attempts to resume execution *inside* a node, only *between* them.

### Run state

Each active run persists a `state.json` in `.xflow/runs/<run-id>/`:

```json
{
  "actorSnapshot": { "...": "XState snapshot" },
  "currentNodeId": "n2",
  "nodeStatus": "running",
  "startedAt": "2026-03-06T10:00:00Z",
  "lastCheckpointAt": "2026-03-06T10:01:00Z"
}
```

`nodeStatus` is one of `"running"` | `"completed"` | `"interrupted"`.

The actor snapshot is written **after** each node completes, so the persisted state always reflects the last successfully finished node.

### On app restart

XFlow scans all `runs/` directories across open projects for any run where `nodeStatus` is `"running"` or `"interrupted"`. These are surfaced to the user in an **Interrupted Runs** panel before normal use resumes.

### Interrupted run resolution

When a run is found in an interrupted state the user can:

- **Retry** — re-run the interrupted node from scratch, then continue the workflow as normal
- **Abort** — cancel the run entirely; the ticket stays in its current lane with the run marked as aborted in its history

### Node status transitions

```
         app closes
running ────────────→ interrupted
   │                      │
   │ completes        user retries
   ↓                      │
completed ←───────────────┘
```

### Wait-for-approval nodes

These are a special case — the actor is simply paused waiting for a user event, not actively executing anything. On restart they are restored to their waiting state automatically and the approval UI is re-surfaced in the ticket detail view. No user intervention required.

Features intentionally set aside for later phases. Captured here to avoid losing the ideas.

### Parallel Agent Orchestration
XFlow's workflow nodes will remain single sequential steps for now. Claude Code handles its own internal parallelism natively, which covers most real-world use cases. A dedicated `parallelAgent` node type — where XFlow itself fans out into multiple simultaneous Claude Code processes managed via XState parallel states — can be revisited once the core engine is stable.

### Workflow Sharing & Templates
Workflows are currently scoped to a single project's `.xflow/` directory. Exporting and importing workflow IR JSON as reusable templates (to share between projects or with other users) is a natural future feature but adds surface area around versioning and node compatibility that's best tackled later.