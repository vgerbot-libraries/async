---
title: retry
description: Wrap an async task with automatic retry logic.
---

`retry` wraps an async task and retries it according to the specified retry options if it fails. It is a convenience wrapper around `cancellable` with the `retry` option.

> **Best for unreliable operations**
> Use `retry` when calling flaky APIs, performing network requests, or executing operations that may transiently fail.

## Import

Root package:

```ts
import { retry } from "@vgerbot/async";
```

Module subpath:

```ts
import { retry } from "@vgerbot/async/control-flow";
```

Leaf subpath:

```ts
import { retry } from "@vgerbot/async/control-flow/retry";
```

## Quick example

```ts
import { retry } from "@vgerbot/async";

const handle = retry(
  async (token) => {
    const response = await token.wrap(fetch("/api/data"));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
  {
    maxAttempts: 3,
    delay: 1000,
    backOff: "exponential",
  },
);

const data = await handle;
```

## When to use `retry`

- **Flaky APIs**: Retry network requests that may fail due to transient errors.
- **Resource acquisition**: Retry connecting to databases or services that may be temporarily unavailable.
- **Rate-limited endpoints**: Combine with delay/backoff to respect rate limits.
- **Startup sequences**: Retry initialization steps that depend on external systems.

## API

```ts
function retry<T>(
  task: AsyncTask<T>,
  retryOptions: RetryOptions,
  options?: CancellableOptions<T>,
): CancellableHandle<T>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `task` | `AsyncTask<T>` | — | The async task to execute. Receives a `CancellableToken`. |
| `retryOptions` | `RetryOptions` | — | Retry configuration. |
| `options` | `CancellableOptions<T>` | `undefined` | Additional cancellable configuration options. |

### `RetryOptions`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `maxAttempts` | `number` | `3` | Maximum number of retry attempts (including the first try). |
| `delay` | `number` | `0` | Delay in milliseconds between retry attempts. |
| `backOff` | `"constant" \| "exponential"` | `"constant"` | Backoff strategy. `"exponential"` doubles the delay on each retry. |
| `retryIf` | `(error: unknown) => boolean` | `() => true` | Predicate to decide whether to retry on a given error. |

### Return value

Returns a `CancellableHandle<T>` that resolves to the task result or rejects with the last error if all retries fail.

```ts
const handle = retry(myTask, { maxAttempts: 5 });

const result = await handle;
handle.cancel("No longer needed");
handle.isCancelled();
handle.signal;
```

## Execution model

`retry` delegates to `cancellable(task, { ...options, retry: retryOptions })`. On each failure, the retry logic checks the `retryIf` predicate and waits for the configured delay (with optional exponential backoff) before trying again.

```ts
const handle = retry(
  async (token) => {
    const response = await token.wrap(fetch("/api/unstable"));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
  {
    maxAttempts: 4,
    delay: 500,
    backOff: "exponential",
    retryIf: (error) => {
      // Only retry on 5xx errors
      return error instanceof Error && error.message.includes("HTTP 5");
    },
  },
);
```

## Error handling

If all retry attempts fail, the handle rejects with the last error thrown by the task.

```ts
try {
  await retry(
    async () => {
      throw new Error("Always fails");
    },
    { maxAttempts: 3, delay: 100 },
  );
} catch (error) {
  console.log("All retries exhausted:", error);
}
```

Use `retryIf` to selectively retry only on certain errors:

```ts
const handle = retry(
  async (token) => {
    const response = await token.wrap(fetch("/api/data"));
    if (response.status === 429) throw new Error("Rate limited");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
  {
    maxAttempts: 5,
    delay: 1000,
    backOff: "exponential",
    retryIf: (error) => error instanceof Error && error.message === "Rate limited",
  },
);
```

## Cancellation

The handle can be cancelled externally at any time. Cancellation interrupts any ongoing retry wait.

```ts
const handle = retry(myTask, { maxAttempts: 10, delay: 5000 });

// Cancel during a retry wait
setTimeout(() => handle.cancel("User cancelled"), 2000);
```

## TypeScript tips

`retry` is generic over `T`, so the return type is inferred from the task.

```ts
const handle = retry(
  async (token) => {
    const res = await token.wrap(fetch("/api/user"));
    return res.json() as Promise<{ id: number; name: string }>;
  },
  { maxAttempts: 3 },
);

const user = await handle; // { id: number; name: string }
```

## Related APIs

- [`timeout`](/reference/control-flow/timeout/) wraps a task with a deadline.
- [`cancellable`](/reference/cancellable/) creates a cancellable handle with full options.
- [`tryEach`](/reference/control-flow/try-each/) tries multiple tasks in sequence until one succeeds.
- [`forever`](/reference/control-flow/forever/) runs a task indefinitely until cancelled.
