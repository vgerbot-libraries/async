---
title: Cancellable
description: The core cancellation primitive — handles, tokens, and errors for cooperative async cancellation.
---

Cancellable is the foundation of `@vgerbot/async`. Every async operation in the library is built on top of `cancellable`, which provides cooperative cancellation via `CancellableHandle` (external) and `CancellableToken` (internal).

## Import

```ts
import { cancellable, CancellableHandle, CancellableToken, CancelError } from "@vgerbot/async";
```

```ts
import { cancellable, CancelError } from "@vgerbot/async/cancellable";
```

## Core concepts

- **`cancellable`** — wraps an async function with cancellation support.
- **`CancellableHandle`** — returned to the caller. Used to `await`, `cancel()`, and inspect state.
- **`CancellableToken`** — passed to the task. Used to `sleep()`, `wrap()`, check cancellation, and register cleanup.
- **`CancelError`** — the error type thrown when a task is cancelled.

## Quick example

```ts
import { cancellable, CancelError } from "@vgerbot/async";

const handle = cancellable(async (token) => {
  await token.sleep(5000);
  return "done";
});

setTimeout(() => handle.cancel("User navigated away"), 1000);

try {
  const result = await handle;
} catch (error) {
  if (error instanceof CancelError) {
    console.log("Cancelled:", error.reason);
  }
}
```

## APIs

| API | Description |
| --- | --- |
| [`cancellable`](/reference/cancellable/cancellable/) | Creates a cancellable handle for an async task. |
| [`CancellableHandle`](/reference/cancellable/cancellable-handle/) | The handle returned to the caller. |
| [`CancellableToken`](/reference/cancellable/cancellable-token/) | The token passed to the task for cooperative cancellation. |
| [`CancelError`](/reference/cancellable/cancel-error/) | The error type thrown on cancellation. |

## Related APIs

- [Control Flow](/reference/control-flow/)
- [Executors](/reference/executors/)
- [Cancellation and Timeouts](/guides/cancellation-and-timeouts/)
