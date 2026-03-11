## Node Registry

`src/shared/node-registry.ts` is the single source of truth for node types, colors, labels, descriptions, config hints, and events.

### When adding or removing a node type

1. Update `IRNodeType` in `src/shared/types.ts`
2. Update `NODE_REGISTRY` in `src/shared/node-registry.ts`
3. Update `getDefaultConfig()` and `getNodeLabel()` in `src/mainview/lib/workflow-ir.ts`
4. Update `docs/nodes.md`
