---
title: cancellable
description: Create a cancellable handle for an async task with optional timeout, retry, and fallback.
---

`cancellable` is the core primitive of `@vgerbot/async`. It wraps an async function with cancellation support, returning a `CancellableHandle` that can be cancelled, awaited, and inspected.

> **Foundation of the library**
> All other APIs (`delay`, `timeout`, `retry`, `map`, `queue`, etc.) are built on top of `cancellable`.

## Import

Root package:

```ts
import { cancellable } from "@vgerbot/async";
```

Module subpath:

```ts
import { cancellable } from "@vgerbot/async/cancellable";
```

Leaf subpath:

```ts
import { cancellable } from "@vgerbot/async/cancellable/cancellable";
```

## Quick example

```ts
import { cancellable } from "@vgerbot/async";

const handle = cancellable(async (token) => {
  await token.sleep(5000);
  return "done";
});

// Cancel after 1 second
setTimeout(() => handle.cancel("User navigated away"), 1000);

try {
  const result = await handle.promise;
} catch (error) {
  if (error instanceof CancelError) {
    console.log("Task was cancelled");
  }
}
```

## When to use `cancellable`

- **Custom cancellable operations**: Wrap any async function with cancellation support.
- **Building blocks**: Use as the foundation for higher-level control-flow and collection APIs.
- **External signal integration**: Link an `AbortSignal` to an async operation.
- **Timeout and retry**: Use the built-in `timeout` and `retry` options.

## API

```ts
function cancellable<T>(
  task: AsyncTask<T>,
  options?: CancellableOptions<T>,
): CancellableHandle<T>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `task` | `AsyncTask<T>` | — | Async function that receives a `CancellableToken`. |
| `options` | `CancellableOptions<T>` | `undefined` | Configuration options. |

### `AsyncTask<T>`

```ts
type AsyncTask<T> = (token: CancellableToken) => Promise<T>;
```

### `CancellableOptions<T>`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | `string` | `undefined` | Name used in cancellation labels and error messages. |
| `signal` | `AbortSignal` | `undefined` | External `AbortSignal` linked to the task. When the signal aborts, the task is cancelled. |
| `onCancel` | `(error: CancelError) => void \| Promise<void>` | `undefined` | Called when the task is cancelled. Receives the `CancelError`. Useful for cleanup. |
| `onRetry` | `(info: { attempt, maxAttempts, error, waitMs }) => void \| Promise<void>` | `undefined` | Called before waiting between retry attempts. |
| `fallback` | `T \| Promise<T> \| ((error: unknown, isCancelled: boolean) => Promise<T>)` | `undefined` | Fallback value or function used when the task rejects. |
| `retry` | `RetryOptions` | `undefined` | Retry configuration for the task. |
| `timeout` | `number` | `undefined` | Cancels the task after the specified milliseconds. |

### `RetryOptions`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `maxAttempts` | `number` | `3` | Maximum number of retry attempts (including the first try). |
| `delay` | `number \| ((attempt: number, error: Error) => number)` | `0` | Delay in milliseconds between retry attempts, or a function that calculates the delay. |
| `backOff` | `"linear" \| "exponential"` | `undefined` | Backoff strategy. `"linear"` increases delay linearly (`delay * attempt`). `"exponential"` doubles the delay on each retry (`delay * 2^attempt`). |
| `retryIf` | `(error: Error) => boolean` | `() => true` | Predicate to decide whether to retry on a given error. |

### Return value

Returns a `CancellableHandle<T>` — see the [CancellableHandle reference](/reference/cancellable/cancellable-handle/) for full details.

```ts
const handle = cancellable(myTask);

await handle.promise;       // await the result
handle.cancel("reason");    // cancel the task
handle.isCancelled();       // check if cancelled
handle.signal;              // AbortSignal
handle.cancelError;         // CancelError if cancelled
```

## Execution model

1. Create a `CancellableToken` and `CancellableHandle` pair.
2. If `signal` is provided, link it to the token.
3. If `timeout` is set, start a timer that cancels the task after the duration.
4. Call `task(token)` and await its result.
5. On success, resolve the handle's promise.
6. On failure, check `retry` options — if retries are available and `retryIf` returns `true`, wait and retry.
7. If all retries are exhausted or no retry is configured, check `fallback` — if provided, resolve with the fallback value.
8. On cancellation, reject with a `CancelError`.

## Error handling

### Task errors

If the task throws and no retry or fallback is configured, the handle rejects with the error.

```ts
try {
  await cancellable(async () => {
    throw new Error("task failed");
  }).promise;
} catch (error) {
  console.log(error); // Error: task failed
}
```

### Fallback

Use `fallback` to provide a value when the task fails:

```ts
const handle = cancellable(
  async (token) => {
    const res = await token.wrap(fetch("/api/data"));
    if (!res.ok) throw new Error("HTTP error");
    return res.json();
  },
  { fallback: { defaultData: true } },
);

const result = await handle.promise; // { defaultData: true } if fetch fails
```

### Retry

Use `retry` to retry on failure:

```ts
const handle = cancellable(
  async (token) => {
    const res = await token.wrap(fetch("/api/unstable"));
    if (!res.ok) throw new Error("HTTP error");
    return res.json();
  },
  {
    retry: {
      maxAttempts: 3,
      delay: 1000,
      backOff: "exponential",
      retryIf: (error) => error instanceof Error && error.message.includes("HTTP 5"),
    },
  },
);
```

### Timeout

Use `timeout` to cancel the task after a deadline:

```ts
const handle = cancellable(
  async (token) => {
    await token.sleep(10_000);
    return "done";
  },
  { timeout: 1000 },
);

// Rejects with CancelError after 1 second
```

## Cancellation

### External cancellation

Call `cancel()` on the handle to cancel the task:

```ts
const handle = cancellable(myTask, { name: "myTask" });

handle.cancel("No longer needed");
```

### Signal-based cancellation

Pass an `AbortSignal` to link external cancellation:

```ts
const controller = new AbortController();

const handle = cancellable(
  async (token) => {
    await token.sleep(5000);
    return "done";
  },
  { signal: controller.signal },
);

controller.abort(); // Cancels the task
```

### `onCancel` callback

Use `onCancel` for cleanup when the task is cancelled:

```ts
const handle = cancellable(
  async (token) => {
    const connection = await openConnection();
    try {
      return await token.wrap(doWork(connection));
    } finally {
      connection.close();
    }
  },
  {
    onCancel: () => {
      console.log("Task was cancelled, cleaning up");
    },
  },
);
```

## TypeScript tips

`cancellable` is generic over `T`, so the return type is inferred from the task.

```ts
const handle = cancellable(async (token) => {
  const res = await token.wrap(fetch("/api/user"));
  return res.json() as Promise<{ id: number; name: string }>;
});

const user = await handle.promise; // { id: number; name: string }
```

## Related APIs

- [`CancellableHandle`](/reference/cancellable/cancellable-handle/) — the handle returned by `cancellable`.
- [`CancellableToken`](/reference/cancellable/cancellable-token/) — the token passed to the task.
- [`CancelError`](/reference/cancellable/cancel-error/) — the error type thrown on cancellation.
- [`delay`](/reference/control-flow/delay/) — cancellable delay.
- [`timeout`](/reference/control-flow/timeout/) — task with timeout.
- [`retry`](/reference/control-flow/retry/) — task with retry logic.
