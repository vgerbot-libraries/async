---
title: parallel
description: Run multiple async tasks concurrently with an optional concurrency limit.
---

`parallel` executes multiple async tasks concurrently and collects their results in order. It is also exported as `all` for familiarity with `Promise.all`.

> **Best for independent tasks**
> Use `parallel` when you have multiple independent async operations and want their results collected in order.

## Import

Root package:

```ts
import { parallel, all } from "@vgerbot/async";
```

Module subpath:

```ts
import { parallel, all } from "@vgerbot/async/control-flow";
```

Leaf subpath:

```ts
import { parallel } from "@vgerbot/async/control-flow/parallel";
```

## Quick example

```ts
import { parallel } from "@vgerbot/async";

const handle = parallel(
  [
    async (token) => {
      await token.sleep(100);
      return "a";
    },
    async (token) => {
      await token.sleep(50);
      return "b";
    },
    async (token) => {
      await token.sleep(75);
      return "c";
    },
  ],
  { concurrency: 2 },
);

const results = await handle.promise;
// ["a", "b", "c"] — results are in the original order
```

## When to use `parallel`

- **Independent operations**: Fetch multiple resources, process multiple files, or call multiple APIs simultaneously.
- **Controlled concurrency**: Limit the number of simultaneous operations to avoid overwhelming resources.
- **Ordered results**: Collect results in the same order as the input tasks, regardless of completion order.
- **Cancellable batches**: Cancel the entire batch when the result is no longer needed.

## API

```ts
function parallel<T>(
  tasks: AsyncTask<T>[],
  options?: ParallelOptions<T>,
): CancellableHandle<T[]>;
```

`all` is an alias for `parallel`:

```ts
import { all } from "@vgerbot/async";

const results = await all(tasks).promise;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `tasks` | `AsyncTask<T>[]` | — | Array of async tasks to execute. Each receives a `CancellableToken`. |
| `options` | `ParallelOptions<T>` | `undefined` | Configuration options. |

### `ParallelOptions`

`ParallelOptions` extends `CancellableOptions<T[]>` with:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `Infinity` | Maximum number of tasks running simultaneously. |
| `name` | `string` | `"parallel"` | Name used in cancellation labels. |
| `signal` | `AbortSignal` | `undefined` | External signal linked to the batch. |
| `timeout` | `number` | `undefined` | Cancels the batch after the specified milliseconds. |
| `fallback` | value or function | `undefined` | Fallback value used when the batch rejects. |
| `retry` | `RetryOptions` | `undefined` | Retry configuration applied to the whole batch. |

### Return value

Returns a `CancellableHandle<T[]>` that resolves to an array of results in the same order as the input tasks.

```ts
const handle = parallel(tasks, { concurrency: 3 });

const results = await handle.promise;
handle.cancel("No longer needed");
handle.isCancelled();
handle.signal;
```

## Execution model

`parallel` uses a slot-filling concurrency limiter. When `concurrency` is finite, it starts at most N tasks simultaneously. As soon as one completes, the next pending task starts. Results are collected in the original input order.

```ts
// With concurrency: 2, at most 2 tasks run at any time
const handle = parallel(
  [
    async (token) => { await token.sleep(100); return 1; },
    async (token) => { await token.sleep(50); return 2; },
    async (token) => { await token.sleep(75); return 3; },
    async (token) => { await token.sleep(25); return 4; },
  ],
  { concurrency: 2 },
);

const results = await handle.promise; // [1, 2, 3, 4]
```

Without a concurrency limit, all tasks start immediately (equivalent to `Promise.all`).

## Error handling

If any task rejects, `parallel` rejects with the first error. Other in-flight tasks are not cancelled automatically—they will continue to run, but their results are discarded.

```ts
try {
  await parallel([
    async () => "ok",
    async () => { throw new Error("fail"); },
    async () => "also ok",
  ]).promise;
} catch (error) {
  console.log("Parallel failed:", error);
}
```

To collect all results regardless of failures, use [`allSettled`](/reference/control-flow/all-settled/) or wrap individual tasks with [`reflect`](/reference/control-flow/reflect/).

## Cancellation

All tasks share a single `CancellableToken`. Calling `cancel()` on the handle signals cancellation to all running tasks.

```ts
const handle = parallel(
  Array.from({ length: 10 }, (_, i) =>
    async (token) => {
      await token.sleep(1000);
      return i;
    }
  ),
  { concurrency: 3, name: "batchFetch" },
);

setTimeout(() => handle.cancel("User navigated away"), 500);

try {
  await handle.promise;
} catch (error) {
  if (error instanceof CancelError) {
    console.log("Batch was cancelled");
  }
}
```

## TypeScript tips

`parallel` is generic over `T`, so all tasks must return the same type `T`.

```ts
const handle = parallel([
  async (token) => 1,
  async (token) => 2,
  async (token) => 3,
]);

const results = await handle.promise; // number[]
```

For heterogeneous result types, use a union type or `reflect`:

```ts
const handle = parallel<string | number>([
  async () => "hello",
  async () => 42,
]);

const results = await handle.promise; // (string | number)[]
```

## Related APIs

- [`series`](/reference/control-flow/series/) runs tasks one after another.
- [`allSettled`](/reference/control-flow/all-settled/) waits for all tasks and collects outcomes.
- [`race`](/reference/control-flow/race/) resolves with the first task to settle.
- [`any`](/reference/control-flow/any/) resolves with the first task to fulfill.
- [`reflect`](/reference/control-flow/reflect/) wraps a task to always resolve.
- [`map`](/reference/collections/map/) maps over a collection with concurrency control.
