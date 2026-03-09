## Workflow engine

The workflow engine is built on top of XState and React Flow. Each workflow is a directed graph of nodes connected by edges. A ticket entering a lane with an attached workflow triggers a run that executes nodes sequentially, following edge transitions.

### Workflow nodes

The workflow engine uses built-in node types (see [nodes.md](docs/nodes.md) for details).