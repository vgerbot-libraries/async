---
title: any
description: Run multiple async tasks and resolve with the first one to fulfill.
---

`any` runs multiple async tasks concurrently and resolves with the first one to fulfill. If all tasks reject, it rejects with an `AggregateError`. It is the cancellable equivalent of `Promise.any`.

> **Best for first success**
> Use `any` when you have multiple fallback sources and want the first successful result.

## Import

Root package:

```ts
import { any } from "@vgerbot/async";
```

Module subpath:

```ts
import { any } from "@vgerbot/async/control-flow";
```

Leaf subpath:

```ts
import { any } from "@vgerbot/async/control-flow/any";
```

## Quick example

```ts
import { any } from "@vgerbot/async";

const handle = any([
  async (token) => {
    const res = await token.wrap(fetch("https://api1.example.com/data"));
    if (!res.ok) throw new Error("api1 down");
    return res.json();
  },
  async (token) => {
    const res = await token.wrap(fetch("https://api2.example.com/data"));
    if (!res.ok) throw new Error("api2 down");
    return res.json();
  },
]);

const data = await handle.promise; // First successful response
```

## When to use `any`

- **Redundant sources**: Query multiple API endpoints and use the first that responds successfully.
- **Fallback strategies**: Try multiple approaches and use whichever works first.
- **Best-effort operations**: Attempt several alternatives, succeeding if any one works.
- **Cancellable batches**: Cancel remaining tasks once one succeeds.

## API

```ts
function any<T>(
  tasks: AsyncTask<T>[],
  options?: CancellableOptions<T>,
): CancellableHandle<T>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `tasks` | `AsyncTask<T>[]` | — | Array of async tasks to execute. Each receives a `CancellableToken`. |
| `options` | `CancellableOptions<T>` | `undefined` | Cancellable configuration options. |

### Return value

Returns a `CancellableHandle<T>` that resolves with the first task to fulfill, or rejects with an `AggregateError` if all tasks reject.

```ts
const handle = any(tasks);

const result = await handle.promise;
handle.cancel("No longer needed");
handle.isCancelled();
handle.signal;
```

## Execution model

All tasks start concurrently and share a `CancellableToken`. The handle resolves as soon as the first task fulfills. Remaining tasks receive a cancellation signal.

```ts
const handle = any([
  async (token) => { await token.sleep(100); throw new Error("fail"); },
  async (token) => { await token.sleep(200); return "success"; },
  async (token) => { await token.sleep(500); return "also success"; },
]);

// Resolves with "success" after 200ms
// First task's rejection is ignored
// Third task is cancelled
```

## Error handling

If all tasks reject, the handle rejects with an `AggregateError` containing all rejection reasons.

```ts
try {
  await any([
    async () => { throw new Error("fail1"); },
    async () => { throw new Error("fail2"); },
  ]).promise;
} catch (error) {
  if (error instanceof AggregateError) {
    console.log("All tasks failed:", error.errors);
  }
}
```

## Cancellation

Calling `cancel()` on the handle cancels all participating tasks.

```ts
const handle = any([
  async (token) => { await token.sleep(5000); return "result"; },
], { name: "anyOperation" });

setTimeout(() => handle.cancel("User cancelled"), 100);
```

## TypeScript tips

`any` is generic over `T`. All tasks must return the same type.

```ts
const handle = any([
  async () => 1,
  async () => 2,
]);

const result = await handle.promise; // number
```

## Related APIs

- [`race`](/reference/control-flow/race/) settles with the first task to complete (fulfill or reject).
- [`allSettled`](/reference/control-flow/all-settled/) waits for all tasks and collects all outcomes.
- [`parallel`](/reference/control-flow/parallel/) runs all tasks and collects all results.
- [`tryEach`](/reference/control-flow/try-each/) tries tasks sequentially until one succeeds.
