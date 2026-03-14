## Shadcn

Shadcn has a large array of components. these should be used where possible. If the component needed is not part of their selection of components we may write a custom component.

## Component structure

Prefer composable components, rather than config heavy components

## Confirmation dialogs

Use the `useConfirm` hook from `src/mainview/hooks/useConfirm.tsx` for all destructive action confirmations. Do not implement custom confirmation modals or use `window.confirm()`.

```ts
const confirm = useConfirm();
const confirmed = await confirm({
  title: "Delete item?",
  description: "This cannot be undone.",
  confirmLabel: "Delete",
  variant: "danger",
});
if (!confirmed) return;
```