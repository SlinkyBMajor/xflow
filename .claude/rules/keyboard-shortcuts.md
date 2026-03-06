## Keyboard Shortcuts

### Registry location
All keyboard shortcuts are documented in `src/mainview/lib/shortcut-registry.ts`.

### When adding or removing a shortcut
1. Update the `SHORTCUT_REGISTRY` array to reflect the change
2. Place in the correct group (Global, Kanban etc) — create a new group only for a clearly distinct context
3. Use macOS modifier symbols: ⌘ (Cmd), ⇧ (Shift), ⌥ (Option), ⌃ (Control)

### Choosing shortcut keys
- Check the registry for conflicts before assigning a new shortcut
- Avoid ⌘H (macOS "Hide Application") and other system-reserved shortcuts
- Prefer conventions from GitHub, VS Code, or Slack when applicable
