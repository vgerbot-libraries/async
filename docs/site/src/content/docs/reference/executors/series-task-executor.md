---
title: SeriesTaskExecutor
description: A task executor that runs tasks sequentially, one at a time.
---

`SeriesTaskExecutor` is a task executor that processes tasks one at a time in submission order. It is a thin wrapper around `PoolTaskExecutor` with concurrency set to 1.

> **Best for strict ordering**
> Use `SeriesTaskExecutor` when tasks must run one after another with no overlap.

## Import

Root package:

```ts
import { SeriesTaskExecutor } from "@vgerbot/async";
```

Module subpath:

```ts
import { SeriesTaskExecutor } from "@vgerbot/async/executors";
```

Leaf subpath:

```ts
import { SeriesTaskExecutor } from "@vgerbot/async/executors/SeriesTaskExecutor";
```

## Quick example

```ts
import { SeriesTaskExecutor } from "@vgerbot/async";

const executor = new SeriesTaskExecutor();

const result1 = await executor.exec(async (token) => {
  await token.sleep(100);
  return "first";
});

const result2 = await executor.exec(async (token) => {
  return "second";
});

// "first" completes before "second" starts
```

## When to use `SeriesTaskExecutor`

- **Strict ordering**: Tasks must complete in submission order with no overlap.
- **Resource serialization**: Prevent concurrent access to a shared resource.
- **Sequential pipelines**: Run tasks one after another with executor-level cancellation.
- **Simple alternative to `queue`**: When you don't need queue management features.

## API

```ts
class SeriesTaskExecutor implements ITaskExecutor {
  constructor();

  exec<T>(task: AsyncTask<T>, options?: TaskOptions): TaskHandle<T>;
  cancel(reason?: unknown): void;
  cancel(options: TaskCancelOptions): void;
  shutdown(reason?: unknown): void;
  isCancelled(): boolean;
}
```

### Constructor

```ts
new SeriesTaskExecutor()
```

No configuration options. Concurrency is fixed at 1.

### Methods

#### `exec(task, options?)`

Submits a task for execution. The task starts only after all previously submitted tasks have completed.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `task` | `AsyncTask<T>` | — | Async function that receives a `CancellableToken`. |
| `options` | `TaskOptions` | `undefined` | Task metadata (kind, name, metadata). |

Returns a `TaskHandle<T>` that resolves when the task completes.

#### `cancel(reason?)` / `cancel(options)`

Cancels matching tasks. Use `shutdown()` to permanently close the executor.

```ts
executor.cancel("Shutting down");
```

Selective cancellation by task kind:

```ts
executor.cancel({ kind: "low-priority" });
```

#### `isCancelled()`

Returns `true` if the executor has been permanently shut down.

## Execution model

`SeriesTaskExecutor` wraps a `PoolTaskExecutor` with `concurrency: 1`. Tasks are queued and processed one at a time. Each task receives its own `CancellableToken` derived from the executor's lifecycle.

## Error handling

If a task throws, the task's promise rejects with that error. The executor continues processing subsequent tasks.

```ts
try {
  await executor.exec(async () => {
    throw new Error("fail");
  });
} catch (error) {
  console.log("Task failed:", error);
}

// Next task still runs
const result = await executor.exec(async () => "ok");
```

## Cancellation

### Executor-level cancellation

Calling `cancel()` cancels matching tasks. To permanently disable the executor, call `shutdown()`.

```ts
const executor = new SeriesTaskExecutor();

executor.exec(async (token) => { await token.sleep(5000); return "slow"; });
executor.exec(async () => "never runs");

executor.cancel("Shutting down");
```

### Selective cancellation

Cancel tasks by kind without disabling the executor:

```ts
executor.exec(async () => "important", { kind: "critical" });
executor.exec(async () => "less important", { kind: "background" });

// Cancel only background tasks
executor.cancel({ kind: "background" });
```

## TypeScript tips

`exec` is generic over `T`, so the return type is inferred from the task.

```ts
const result = await executor.exec(async (token) => {
  const res = await token.wrap(fetch("/api/data"));
  return res.json() as Promise<{ id: number }>;
}); // { id: number }
```

## Related APIs

- [`PoolTaskExecutor`](/reference/executors/pool-task-executor/) — configurable concurrency pool.
- [`PriorityPoolExecutor`](/reference/executors/priority-pool-executor/) — pool with priority scheduling.
- [`ITaskExecutor`](/reference/executors/itask-executor/) — common executor interface.
- [`series`](/reference/control-flow/series/) — one-off sequential task execution.
