---
title: timeout
description: Wrap an async task with an automatic timeout.
---

`timeout` wraps an async task and automatically cancels it if it does not complete within the specified duration. It is a convenience wrapper around `cancellable` with the `timeout` option.

> **Best for deadlines**
> Use `timeout` when you need to enforce a maximum execution time for operations that might hang, such as network requests or slow computations.

## Import

Root package:

```ts
import { timeout } from "@vgerbot/async";
```

Module subpath:

```ts
import { timeout } from "@vgerbot/async/control-flow";
```

Leaf subpath:

```ts
import { timeout } from "@vgerbot/async/control-flow/timeout";
```

## Quick example

```ts
import { timeout } from "@vgerbot/async";

const handle = timeout(
  async (token) => {
    await token.sleep(2000);
    return "done";
  },
  1000, // 1 second timeout
);

try {
  await handle;
} catch (error) {
  console.log("Task timed out");
}
```

## When to use `timeout`

- **Network deadlines**: Ensure fetch requests or API calls don't hang indefinitely.
- **User-facing operations**: Prevent long-running tasks from blocking user interaction.
- **Fallback strategies**: Combine with `retry` to retry operations that time out.
- **Resource cleanup**: Guarantee that operations complete within a known timeframe.

## API

```ts
function timeout<T>(
  task: AsyncTask<T>,
  ms: number,
  options?: CancellableOptions<T>,
): CancellableHandle<T>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `task` | `AsyncTask<T>` | — | The async task to execute. Receives a `CancellableToken`. |
| `ms` | `number` | — | Timeout duration in milliseconds. |
| `options` | `CancellableOptions<T>` | `undefined` | Additional cancellable configuration options. |

### Return value

Returns a `CancellableHandle<T>` that resolves to the task result or rejects with a `CancelError` if the timeout elapses.

```ts
const handle = timeout(myTask, 5000);

const result = await handle;
handle.cancel("No longer needed");
handle.isCancelled();
handle.signal;
```

## Execution model

`timeout` delegates to `cancellable(task, { ...options, timeout: ms })`. The task receives a `CancellableToken` that is automatically cancelled when the timeout expires. The task should use the token's methods (`sleep`, `wrap`, `throwIfCancelled`) to cooperate with cancellation.

```ts
const handle = timeout(
  async (token) => {
    const response = await token.wrap(fetch("/api/large-dataset"));
    return response.json();
  },
  5000,
);

const data = await handle;
```

## Error handling

If the timeout expires, the handle rejects with a `CancelError`.

```ts
import { CancelError } from "@vgerbot/async";

try {
  await timeout(async (token) => {
    await token.sleep(10_000);
  }, 1000);
} catch (error) {
  if (error instanceof CancelError) {
    console.log("Timed out:", error.message);
  }
}
```

You can provide a `fallback` value or function to resolve instead of rejecting:

```ts
const handle = timeout(
  async (token) => {
    await token.sleep(10_000);
    return "slow result";
  },
  1000,
  { fallback: "default value" },
);

const result = await handle; // "default value"
```

## Cancellation

The handle can be cancelled externally at any time, in addition to the automatic timeout.

```ts
const handle = timeout(myTask, 5000, { name: "fetchWithDeadline" });

// Cancel before timeout
handle.cancel("User navigated away");
```

## TypeScript tips

`timeout` is generic over `T`, so the return type is inferred from the task.

```ts
const handle = timeout(
  async (token) => {
    const res = await token.wrap(fetch("/api/user"));
    return res.json() as Promise<{ id: number; name: string }>;
  },
  3000,
);

const user = await handle; // { id: number; name: string }
```

## Related APIs

- [`delay`](/reference/control-flow/delay/) creates a cancellable pause.
- [`retry`](/reference/control-flow/retry/) retries a task on failure.
- [`cancellable`](/reference/cancellable/) creates a cancellable handle with full options.
- [`race`](/reference/control-flow/race/) resolves with the first task to settle.
