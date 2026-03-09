# XFlow — Overview

> A desktop-native agentic Kanban board that lets you define visual workflows on lanes and have AI agents execute them automatically.

---

## What Is XFlow?

XFlow is a macOS desktop application that combines a Kanban board with a visual workflow engine. Each lane on the board can have an attached workflow — a node-based automation that triggers whenever a ticket enters that lane. Workflows can spawn AI agents (Claude Code), run scripts, wait for human approval, and move tickets forward automatically.

The result: a semi-autonomous project management tool where you define the process visually and agents do the work — inside your actual project directory, with full access to your codebase.

---

## Why XFlow?

Most task boards are passive — they track status, but the work still happens elsewhere. XFlow closes that gap. When a ticket moves into a lane, the lane's workflow can:

- Spin up a Claude Code agent to implement the task
- Create an isolated Git worktree so the agent works on a clean branch
- Pause for your review before merging
- Open a pull request or auto-merge when approved
- Move the ticket to the next lane, triggering the next workflow

This turns the board from a status tracker into an execution engine. You drag a ticket into "Implementation", and the work begins.

---

## Core Concepts

| Concept | What It Is |
|---|---|
| **Board** | A Kanban board tied to a local project directory. One board per project. |
| **Lane** | A column on the board. Can have an attached workflow that auto-triggers. |
| **Ticket** | A unit of work — title, description, tags, and accumulated metadata from workflow runs. |
| **Workflow** | A visual node graph (built in the workflow editor) attached to a lane. Defines what happens when a ticket enters. |
| **Run** | A single execution of a workflow, triggered by a ticket entering a lane. Streams events in real time. |

---

## Key Features

### Kanban Board
Full drag-and-drop board with lanes, tickets, WIP limits, and lane colors. Tickets track their history — which lanes they've been through, how long they spent in each, and what workflow outputs were produced along the way.

### Visual Workflow Editor
A React Flow canvas where you build automations by connecting nodes. Ten node types cover the common cases:

- **Claude Agent** — spawns Claude Code CLI with your prompt and ticket context
- **Custom Script** — runs a Bun or shell script
- **Wait for Approval** — pauses until you approve or reject
- **Move to Lane** — advances the ticket, potentially triggering another workflow
- **Condition** — branches based on ticket data or prior outputs
- **Notify** — sends a desktop notification
- **Set Metadata / Log** — writes data to the ticket or event stream

Workflows are versioned — you can view history and restore previous versions.

### Agent Integration
Claude Code agents run in your project directory with full codebase access. Each agent run can optionally create an isolated Git worktree, so changes happen on a separate branch. When the agent finishes, you choose how to land the changes:

- **Auto-merge** — merge and clean up automatically
- **Pull request** — create a PR via GitHub CLI
- **Manual** — review and merge yourself

The agent panel shows real-time output from all active runs, and ticket detail views display the full run history with diffs and merge status.

### Templates
Export your board layout and workflows as reusable templates. Apply them to new projects to bootstrap a consistent process.

---

## Architecture at a Glance

```
Electrobun (macOS desktop shell)
├── React UI (Vite + Tailwind)
│   ├── Kanban Board (drag-and-drop via @dnd-kit)
│   └── Workflow Editor (React Flow)
│
├── Bun Backend (typed RPC over IPC)
│   ├── SQLite + Drizzle ORM (per-project DB)
│   └── XState v5 (workflow execution engine)
│
└── Spawned Processes
    ├── Claude Code CLI (AI agent)
    └── Custom scripts (Bun/shell)
```

The frontend never touches the database — all data flows through typed RPC calls between the React UI and the Bun backend. Workflow execution happens in XState actors that persist their state to SQLite, surviving app restarts.

---

## Project Model

Each XFlow project is a local directory. XFlow creates a `.xflow/` folder inside it containing the SQLite database and run artifacts. Your project files are untouched — agents work directly in the project root (or in isolated worktrees).

Recent projects are remembered for quick re-opening. Multiple projects can be open in separate windows simultaneously.
