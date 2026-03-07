# RPC Patterns

## Requests vs Messages

- **Requests** — async call that expects a response. Subject to `maxRequestTime` timeout.
- **Messages** — fire-and-forget. No timeout, no return value.

Use requests for data queries (CRUD). Use a **message pair** when the operation has unbounded wait time (e.g. native file dialogs) to avoid RPC timeouts.

## Message pair pattern

For long-running operations, send a message to trigger the action, then listen for a message back with the result. The browser side wraps this in a Promise so callers can `await` it. See `requestProjectPicker()` in `src/mainview/rpc.ts` for the reference implementation.

## Sending messages from bun to browser

`BrowserView.defineRPC` handlers don't have direct access to the window. Store a reference to the `BrowserWindow` via `setMainWindow()` in `src/bun/rpc.ts`, then send via `mainWindow.webview.rpc.send.<messageName>(data)`.
