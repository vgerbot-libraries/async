---
title: series
description: Run async tasks sequentially, passing results forward.
---

`series` executes async tasks one after another. Each task receives the result of the previous task (if any) and a `CancellableToken`. The final result is the output of the last task.

> **Best for ordered pipelines**
> Use `series` when each step must complete before the next begins, and later steps may use earlier results.

## Import

Root package:

```ts
import { series } from "@vgerbot/async";
```

Module subpath:

```ts
import { series } from "@vgerbot/async/control-flow";
```

Leaf subpath:

```ts
import { series } from "@vgerbot/async/control-flow/series";
```

## Quick example

```ts
import { series } from "@vgerbot/async";

const handle = series({},
  async (token) => {
    await token.sleep(50);
    return 10;
  },
  async (result, token) => {
    // result is 10 (output of previous task)
    return result * 2;
  },
  async (result, token) => {
    // result is 20
    return `Final: ${result}`;
  },
);

const value = await handle; // "Final: 20"
```

## When to use `series`

- **Sequential pipelines**: Each step depends on the previous step's output.
- **Ordered side effects**: Ensure operations happen in a specific order (e.g., create, update, notify).
- **Resource-constrained environments**: Avoid concurrent operations when resources are limited.
- **Cancellable chains**: Cancel the entire chain from outside.

## API

```ts
// Single task
function series<T1>(
  options: CancellableOptions,
  task1: SeriesTask<void, T1>,
): CancellableHandle<T1>;

// Two tasks
function series<T1, T2>(
  options: CancellableOptions,
  task1: SeriesTask<void, T1>,
  task2: SeriesTask<T1, T2>,
): CancellableHandle<T2>;

// Three tasks
function series<T1, T2, T3>(
  options: CancellableOptions,
  task1: SeriesTask<void, T1>,
  task2: SeriesTask<T1, T2>,
  task3: SeriesTask<T2, T3>,
): CancellableHandle<T3>;

// Four tasks
function series<T1, T2, T3, T4>(
  options: CancellableOptions,
  task1: SeriesTask<void, T1>,
  task2: SeriesTask<T1, T2>,
  task3: SeriesTask<T2, T3>,
  task4: SeriesTask<T3, T4>,
): CancellableHandle<T4>;

// Five or more (untyped chain)
function series(
  options: CancellableOptions,
  task1: SeriesTask<void, unknown>,
  ...args: SeriesTask<unknown, unknown>[],
): CancellableHandle<unknown>;
```

The first task is a `SeriesTask<void, T1>` (receives only a token). Subsequent tasks receive the previous result and a token.

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `options` | `CancellableOptions` | — | Cancellable configuration options. |
| `task1` | `SeriesTask<void, T1>` | — | The first task to execute (receives only a token). |
| `...args` | `SeriesTask<unknown, unknown>[]` | — | Additional tasks to execute in sequence. Each receives the previous task's result. |

### Return value

Returns a `CancellableHandle<T>` that resolves to the result of the last task.

```ts
const handle = series({}, task1, task2, task3);

const result = await handle;
handle.cancel("No longer needed");
handle.isCancelled();
handle.signal;
```

## Execution model

Tasks are executed one at a time. The first task receives only a `CancellableToken`. Each subsequent task receives the resolved value of the previous task and the same token. If any task rejects, the chain stops and the handle rejects with that error.

```ts
const handle = series({},
  async (token) => {
    const res = await token.wrap(fetch("/api/step1"));
    return res.json();
  },
  async (data, token) => {
    const res = await token.wrap(
      fetch("/api/step2", { method: "POST", body: JSON.stringify(data) }),
    );
    return res.json();
  },
  async (result, token) => {
    console.log("Final result:", result);
    return result;
  },
);
```

Tasks can also be `CancellableHandle` instances or `Promise` instances, which are awaited directly.

## Error handling

If any task in the series rejects, the handle rejects immediately with that error. Remaining tasks are not executed.

```ts
try {
  await series({},
    async () => "step1",
    async () => { throw new Error("step2 failed"); },
    async () => "step3 (never runs)",
  );
} catch (error) {
  console.log("Series failed:", error);
}
```

## Cancellation

All tasks share a single `CancellableToken`. Calling `cancel()` on the handle signals cancellation to the currently running task and prevents subsequent tasks from starting.

```ts
const handle = series({ name: "pipeline" },
  async (token) => { await token.sleep(5000); return "slow"; },
  async (result) => `${result} done`,
);

setTimeout(() => handle.cancel("User cancelled"), 100);

try {
  await handle;
} catch (error) {
  if (error instanceof CancelError) {
    console.log("Series was cancelled");
  }
}
```

## TypeScript tips

For up to four tasks, `series` provides typed overloads so the result of each task is passed with the correct type to the next.

```ts
const handle = series({},
  async (token) => 10,                                    // returns number
  async (n: number, token) => `Value: ${n}`,             // receives number, returns string
  async (s: string, token) => ({ result: s }),           // receives string, returns object
);

const result = await handle; // { result: string }
```

For five or more tasks, the chain falls back to `unknown` types. Use explicit type annotations in this case.

## Related APIs

- [`waterfall`](/reference/control-flow/waterfall/) is similar but always passes results forward.
- [`parallel`](/reference/control-flow/parallel/) runs tasks concurrently.
- [`auto`](/reference/control-flow/auto/) runs tasks with dependency-based scheduling.
- [`cancellable`](/reference/cancellable/) creates a cancellable handle for custom tasks.
