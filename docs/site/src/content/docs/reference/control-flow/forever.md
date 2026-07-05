---
title: forever
description: Repeatedly execute a task forever until cancelled.
---

`forever` runs an async task in an infinite loop. The only way to stop it is through cancellation. The handle never resolves—it only rejects when cancelled.

> **Best for long-running loops**
> Use `forever` for polling loops, heartbeat tasks, event processing, or any operation that should run continuously until explicitly stopped.

## Import

Root package:

```ts
import { forever } from "@vgerbot/async";
```

Module subpath:

```ts
import { forever } from "@vgerbot/async/control-flow";
```

Leaf subpath:

```ts
import { forever } from "@vgerbot/async/control-flow/forever";
```

## Quick example

```ts
import { forever } from "@vgerbot/async";

const handle = forever(async (token) => {
  await token.sleep(1000);
  console.log("tick");
});

// Stop after 5 seconds
setTimeout(() => handle.cancel(), 5000);

try {
  await handle;
} catch (error) {
  console.log("Loop stopped");
}
```

## When to use `forever`

- **Polling**: Continuously poll a resource at regular intervals.
- **Heartbeats**: Send periodic heartbeat signals to keep connections alive.
- **Event loops**: Process events from a queue or stream indefinitely.
- **Background tasks**: Run maintenance or cleanup tasks continuously.

## API

```ts
function forever(
  task: AsyncTask<void>,
  options?: CancellableOptions<never>,
): CancellableHandle<never>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `task` | `AsyncTask<void>` | — | The async task to execute repeatedly. Receives a `CancellableToken`. |
| `options` | `CancellableOptions<never>` | `undefined` | Cancellable configuration options. |

### Return value

Returns a `CancellableHandle<never>` that never resolves. It only rejects with a `CancelError` when cancelled.

```ts
const handle = forever(myTask);

// Never resolves — only rejects on cancellation
handle.cancel("Stopping loop");
handle.isCancelled();
handle.signal;
```

## Execution model

`forever` runs the task in a `while (true)` loop. Before each iteration, it checks for cancellation via `token.throwIfCancelled()`. The task receives a `CancellableToken` for cooperative cancellation.

```ts
const handle = forever(async (token) => {
  const status = await token.wrap(fetch("/api/health"));
  if (!status.ok) {
    console.warn("Service unhealthy");
  }
  await token.sleep(5000); // Check every 5 seconds
});
```

## Error handling

If the task throws a non-cancellation error, the loop stops and the handle rejects with that error.

```ts
try {
  await forever(async (token) => {
    const data = await token.wrap(fetch("/api/queue"));
    if (data.status === 500) {
      throw new Error("Server error, stopping loop");
    }
    await token.sleep(1000);
  });
} catch (error) {
  if (error instanceof CancelError) {
    console.log("Loop was cancelled");
  } else {
    console.log("Loop failed:", error);
  }
}
```

## Cancellation

Cancellation is the primary way to stop a `forever` loop. Call `cancel()` on the handle to signal cancellation. The next iteration check will throw a `CancelError`.

```ts
const handle = forever(
  async (token) => {
    await token.sleep(1000);
    console.log("Working...");
  },
  { name: "backgroundWorker" },
);

// Stop after 10 seconds
setTimeout(() => handle.cancel("Shutting down"), 10_000);
```

You can also pass an external `AbortSignal`:

```ts
const controller = new AbortController();

const handle = forever(
  async (token) => {
    await token.sleep(1000);
  },
  { signal: controller.signal },
);

controller.abort();
```

## TypeScript tips

`forever` returns `CancellableHandle<never>`, reflecting that it never resolves. This means `await handle` will never return a value—it will always throw.

```ts
const handle = forever(async (token) => {
  // task logic
});

// Type of handle is Promise<never>
// It only rejects, never resolves
```

## Related APIs

- [`whilst`](/reference/control-flow/whilst/) repeats a task while a condition holds.
- [`times`](/reference/control-flow/times/) repeats a task a fixed number of times.
- [`delay`](/reference/control-flow/delay/) creates a cancellable pause.
- [`cancellable`](/reference/cancellable/) creates a cancellable handle for custom tasks.
