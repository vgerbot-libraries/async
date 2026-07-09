---
title: reflect
description: Wrap a task to always resolve, capturing success or failure as a result object.
---

`reflect` wraps an async task so that it always resolves, never rejects. The result is an object indicating whether the task fulfilled or rejected. This is useful for handling errors without try-catch or for parallel operations where you want all results regardless of failures.

> **Best for error-as-data patterns**
> Use `reflect` when you want to collect outcomes from multiple tasks without short-circuiting on the first failure.

## Import

Root package:

```ts
import { reflect } from "@vgerbot/async";
```

Module subpath:

```ts
import { reflect } from "@vgerbot/async/control-flow";
```

Leaf subpath:

```ts
import { reflect } from "@vgerbot/async/control-flow/reflect";
```

## Quick example

```ts
import { reflect } from "@vgerbot/async";

const handle = reflect(async () => {
  throw new Error("failed");
});

const result = await handle;
// { status: "rejected", reason: Error("failed") }
```

## When to use `reflect`

- **Error-as-data**: Treat successes and failures uniformly as data.
- **Parallel collections**: Use with `parallel` to get all results, even if some tasks fail.
- **Batch reporting**: Collect outcomes from multiple operations for reporting.
- **Selective handling**: Inspect outcomes and decide how to handle failures case-by-case.

## API

```ts
type SettledResult<T> =
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; reason: unknown };

function reflect<T>(
  task: AsyncTask<T>,
  options?: CancellableOptions<SettledResult<T>>,
): CancellableHandle<SettledResult<T>>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `task` | `AsyncTask<T>` | — | The async task to wrap. Receives a `CancellableToken`. |
| `options` | `CancellableOptions<SettledResult<T>>` | `undefined` | Cancellable configuration options. |

### Return value

Returns a `CancellableHandle<SettledResult<T>>` that always resolves to a `SettledResult` object.

```ts
const handle = reflect(myTask);

const result = await handle;
handle.cancel("No longer needed");
handle.isCancelled();
handle.signal;
```

## Execution model

`reflect` wraps the task in a try-catch. If the task succeeds, the result is `{ status: "fulfilled", value }`. If the task throws, the result is `{ status: "rejected", reason }`. The handle itself never rejects due to task errors.

```ts
const handle = reflect(async (token) => {
  const res = await token.wrap(fetch("/api/data"));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
});

const outcome = await handle;

if (outcome.status === "fulfilled") {
  console.log("Data:", outcome.value);
} else {
  console.error("Error:", outcome.reason);
}
```

## Combining with `parallel`

`reflect` is most powerful when combined with `parallel` to collect all outcomes:

```ts
import { parallel, reflect } from "@vgerbot/async";

const handle = parallel({},
  reflect(async () => "success"),
  reflect(async () => { throw new Error("fail"); }),
  reflect(async () => 42),
);

const results = await handle;
// [
//   { status: "fulfilled", value: "success" },
//   { status: "rejected", reason: Error("fail") },
//   { status: "fulfilled", value: 42 },
// ]

const successes = results
  .filter((r) => r.status === "fulfilled")
  .map((r) => (r as { status: "fulfilled"; value: unknown }).value);
```

## Error handling

`reflect` itself does not throw due to task errors. However, cancellation errors still propagate as rejections from the handle.

```ts
const handle = reflect(async (token) => {
  await token.sleep(10_000);
  return "done";
});

handle.cancel("User cancelled");

try {
  await handle;
} catch (error) {
  if (error instanceof CancelError) {
    console.log("Reflected task was cancelled");
  }
}
```

## Cancellation

The wrapped task receives a `CancellableToken`. Calling `cancel()` on the handle cancels the underlying task. If the task is cancelled, the handle rejects with a `CancelError` (rather than returning a rejected `SettledResult`).

```ts
const handle = reflect(
  async (token) => {
    await token.sleep(5000);
    return "result";
  },
  { name: "reflectedTask" },
);

setTimeout(() => handle.cancel("No longer needed"), 100);
```

## TypeScript tips

Use type guards to narrow the `SettledResult` union:

```ts
const outcome = await reflect(async () => 42);

if (outcome.status === "fulfilled") {
  const value: number = outcome.value; // narrowed to number
} else {
  const reason: unknown = outcome.reason; // narrowed to unknown
}
```

## Related APIs

- [`allSettled`](/reference/control-flow/all-settled/) collects outcomes from multiple tasks.
- [`parallel`](/reference/control-flow/parallel/) runs tasks concurrently.
- [`cancellable`](/reference/cancellable/) creates a cancellable handle for custom tasks.
