## Node Registry

`src/shared/node-registry.ts` is the single source of truth for node types, colors, labels, descriptions, config hints, and events.

### When adding or removing a node type

1. Update `IRNodeType` in `src/shared/types.ts`
2. Add a config interface (e.g. `GitActionConfig`) and add it to the `IRNodeConfig` union in `src/shared/types.ts`
3. Update `NODE_REGISTRY` in `src/shared/node-registry.ts`
4. Update `getDefaultConfig()` and `getNodeLabel()` in `src/mainview/lib/workflow-ir.ts`
5. Add a compilation case in `src/bun/engine/compiler.ts` (maps the node to an XState state)
6. Add config UI fields in `src/mainview/components/workflow/NodeConfigPanel.tsx`
7. Add event rendering in `src/mainview/components/ticket/RunEventLog.tsx` for any new event types
8. Update `docs/nodes.md`
