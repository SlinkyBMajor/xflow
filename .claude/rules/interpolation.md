## Interpolation

Template variables in node configs use dot-path syntax that mirrors the `WorkflowContext` structure. This is intentional — it matches the condition evaluator's scope and is what users intuitively write.

### Supported variables

| Variable | Resolves to |
|----------|-------------|
| `{{ticket.title}}` | `context.ticket.title` |
| `{{ticket.id}}` | `context.ticket.id` |
| `{{ticket.laneId}}` | `context.ticket.laneId` |
| `{{ticket.body}}` | `context.ticket.body` |
| `{{ticket.metadata.KEY}}` | `context.ticket.metadata[KEY]` |
| `{{outputs.NODE_ID}}` | `context.nodeOutputs[NODE_ID]` (auto-unwraps `NodeResult.output`) |

### Rules

- **Never use flat names** like `ticketTitle`, `ticketMetadata.KEY`, or `nodeOutputs.ID`. The dot-path syntax (`ticket.title`, `ticket.metadata.KEY`, `outputs.ID`) is the only supported format.
- **Unresolvable variables must throw**, never silently return empty string. This ensures nodes fail fast with a clear error when a template references missing data.
- **Interpolation and condition scopes must stay aligned.** If a new field is added to the condition evaluator's scope in `executor.ts`, add a matching interpolation path in `interpolate.ts`, and vice versa.
