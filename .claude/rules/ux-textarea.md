## Expandable Textareas

Any node config that uses a `<Textarea>` must use the `<ExpandableTextarea>` component from `src/mainview/components/ui/expandable-textarea.tsx` instead.

This gives users an expand button to open the content in a modal dialog for easier editing.

Required props:
- `label`: Dialog title (e.g. "Edit Prompt", "Edit Script")
- `mono`: Set to `true` for code/expression fields
