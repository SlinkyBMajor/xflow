# XFlow

## Project overview

A high level overview of the project can be found in the [overview.md](docs/overview.md) file.

### Project structure

The project is structured into the following folders:

- `docs`: Documentation for the project
- `src`: Source code for the project

### Important tools

The context7 MCP server should be available to fetch documentation on any of the libraries or tools used in the project.

## Workflow engine

The workflow engine is built on top of XState and React Flow. See [workflow.md](docs/workflow.md) for details.

### Workflow nodes

The workflow engine uses built-in node types (see [nodes.md](docs/nodes.md) for details).

### Workflow runs

A workflow run tracks the execution of a workflow against a ticket, including worktree state and merge results. See [workflow-runs.md](docs/workflow-runs.md) for details.

### Feedback loop

Ticket comments, output labels, and approval feedback allow users to guide agents between workflow steps. See [feedback-loop.md](docs/feedback-loop.md) for details.