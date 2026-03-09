# Feedback Loop

Users can provide feedback between workflow steps via ticket comments, output labels, and approval feedback. All feedback is included in subsequent agent context automatically.

## Ticket Comments

Comments on a ticket are displayed in the ticket detail modal, interleaved chronologically with agent outputs. Comments can reference a specific output (e.g., "re: Plan"). When the next agent runs, all comments appear in its context under "Prior Workflow Output & Feedback".

## Output Labels

Agent nodes have an optional **Output Label** field (e.g., "Plan", "Implementation"). The label replaces the node ID in the ticket timeline and in agent context, so both users and agents see meaningful names instead of opaque IDs.

## Approval Feedback

The approval dialog includes an optional feedback textarea. Feedback is saved as a ticket comment labeled "Approval" or "Rejection" and included in the next agent's context.

## Agent Context Format

When "Include prior workflow output" is enabled, agents receive a chronological timeline:

```markdown
## Prior Workflow Output & Feedback

### Plan (agent, 2025-01-15T10:30:00Z)
Here is my proposed implementation plan...

### User Feedback (2025-01-15T10:35:00Z, re: Plan)
Looks good, but use the existing database client instead of creating a new one.

### Implementation (agent, 2025-01-15T10:45:00Z)
I've implemented the feature using the existing database client...
```

## Data Model

Comments are stored in the `ticket_comments` table:

| Column | Description |
|---|---|
| `id` | UUID primary key |
| `ticketId` | Foreign key to the ticket |
| `body` | Comment text |
| `refNodeId` | Optional — the node ID this comment references |
| `refLabel` | Optional — human-readable label of the referenced output |
| `createdAt` | ISO timestamp |
