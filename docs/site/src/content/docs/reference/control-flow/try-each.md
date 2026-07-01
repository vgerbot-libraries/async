---
title: tryEach
description: Try executing tasks in sequence until one succeeds.
---

`tryEach` runs an array of async tasks sequentially, returning the result of the first successful task. If all tasks fail, it throws the last error.

> **Best for fallback chains**
> Use `tryEach` when you have multiple strategies or endpoints to try, and you want the first one that works.

## Import

Root package:

```ts
import { tryEach } from "@vgerbot/async";
```

Module subpath:

```ts
import { tryEach } from "@vgerbot/async/control-flow";
```

Leaf subpath:

```ts
import { tryEach } from "@vgerbot/async/control-flow/tryEach";
```

## Quick example

```ts
import { tryEach } from "@vgerbot/async";

const handle = tryEach([
  async (token) => {
    const res = await token.wrap(fetch("https://api1.example.com/data"));
    if (!res.ok) throw new Error("api1 unavailable");
    return res.json();
  },
  async (token) => {
    const res = await token.wrap(fetch("https://api2.example.com/data"));
    if (!res.ok) throw new Error("api2 unavailable");
    return res.json();
  },
  async (token) => {
    const res = await token.wrap(fetch("https://api3.example.com/data"));
    if (!res.ok) throw new Error("api3 unavailable");
    return res.json();
  },
]);

const data = await handle.promise; // First successful response
```

## When to use `tryEach`

- **Fallback endpoints**: Try multiple API endpoints in priority order.
- **Alternative strategies**: Attempt different approaches to solve a problem.
- **Graceful degradation**: Try the best option first, falling back to less ideal alternatives.
- **Cancellable fallbacks**: Cancel the entire chain from outside.

## API

```ts
function tryEach<T>(
  tasks: AsyncTask<T>[],
  options?: CancellableOptions<T>,
): CancellableHandle<T>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `tasks` | `AsyncTask<T>[]` | — | Array of async tasks to try in order. Each receives a `CancellableToken`. |
| `options` | `CancellableOptions<T>` | `undefined` | Cancellable configuration options. |

### Return value

Returns a `CancellableHandle<T>` that resolves to the first successful result, or rejects with the last error if all tasks fail.

```ts
const handle = tryEach(tasks);

const result = await handle.promise;
handle.cancel("No longer needed");
handle.isCancelled();
handle.signal;
```

## Execution model

Tasks are executed one at a time in order. If a task succeeds, its result is returned immediately and remaining tasks are skipped. If a task fails, the error is stored and the next task is tried. If all tasks fail, the last error is thrown.

```ts
const handle = tryEach([
  async () => { throw new Error("fail 1"); },
  async () => { throw new Error("fail 2"); },
  async () => "success",
]);

const result = await handle.promise; // "success"
```

If the tasks array is empty, `tryEach` throws an error immediately.

## Error handling

If all tasks reject, the handle rejects with the last task's error.

```ts
try {
  await tryEach([
    async () => { throw new Error("fail 1"); },
    async () => { throw new Error("fail 2"); },
  ]).promise;
} catch (error) {
  console.log("All tasks failed:", error); // Error: fail 2
}
```

## Cancellation

All tasks share a single `CancellableToken`. The loop checks for cancellation before each task.

```ts
const handle = tryEach(
  [
    async (token) => { await token.sleep(5000); return "slow"; },
    async (token) => "fast fallback",
  ],
  { name: "fallbackChain" },
);

setTimeout(() => handle.cancel("User cancelled"), 100);
```

## TypeScript tips

`tryEach` is generic over `T`. All tasks must return the same type.

```ts
const handle = tryEach([
  async () => "text",
  async () => "fallback text",
]);

const result = await handle.promise; // string
```

## Related APIs

- [`any`](/reference/control-flow/any/) tries tasks concurrently and resolves with the first to fulfill.
- [`retry`](/reference/control-flow/retry/) retries the same task on failure.
- [`series`](/reference/control-flow/series/) runs tasks sequentially, passing results forward.
- [`race`](/reference/control-flow/race/) settles with the first task to complete.
