---
title: PriorityPoolExecutor
description: A task executor that processes tasks with priority-based scheduling using a max-heap.
---

`PriorityPoolExecutor` is a task executor that processes tasks with priority support. Tasks with higher priority values are processed first. It uses a max-heap priority queue internally.

> **Best for priority-based concurrency**
> Use `PriorityPoolExecutor` when you need concurrent task processing with priority-based scheduling.

## Import

Root package:

```ts
import { PriorityPoolExecutor } from "@vgerbot/async";
```

Module subpath:

```ts
import { PriorityPoolExecutor } from "@vgerbot/async/executors";
```

Leaf subpath:

```ts
import { PriorityPoolExecutor } from "@vgerbot/async/executors/PriorityPoolExecutor";
```

## Quick example

```ts
import { PriorityPoolExecutor } from "@vgerbot/async";

const executor = new PriorityPoolExecutor(2); // concurrency: 2

// Lower priority
executor.exec(async (token) => {
  await token.sleep(100);
  return "low";
}, { kind: "batch" });

// Higher priority — processed first
const result = await executor.exec(
  async (token) => "high priority",
  { priority: 10 },
);

// Cancel background tasks
executor.cancel({ kind: "batch" });
```

## When to use `PriorityPoolExecutor`

- **Priority scheduling**: Process urgent tasks before lower-priority ones.
- **Concurrent processing**: Run multiple tasks simultaneously with priority ordering.
- **Request prioritization**: Handle premium user requests before free-tier requests.
- **Mixed workloads**: Combine high and low priority work in one executor.

## API

```ts
class PriorityPoolExecutor extends BaseTaskExecutor {
  constructor(concurrency: number);

  exec<T>(task: AsyncTask<T>, options?: PriorityTaskOptions): TaskHandle<T>;
  cancel(reason?: unknown): void;
  cancel(options: TaskCancelOptions): void;
  shutdown(reason?: unknown): void;
  isCancelled(): boolean;
}
```

`PriorityTaskOptions` extends `TaskOptions` with an optional `priority` field (default `0`):

```ts
interface PriorityTaskOptions extends TaskOptions {
  priority?: number;
}
```

### Constructor

```ts
new PriorityPoolExecutor(concurrency: number)
```

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | — | Maximum number of concurrent tasks. |

### Methods

#### `exec(task, options?)`

Submits a task with optional priority. Higher `priority` values are processed first; defaults to `0` when omitted.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `task` | `AsyncTask<T>` | — | Async function that receives a `CancellableToken`. |
| `options` | `PriorityTaskOptions` | `undefined` | Task metadata (kind, name, metadata) plus optional `priority`. |

#### `cancel(reason?)` / `cancel(options)`

Cancels matching tasks, or selectively cancels tasks by kind.

## Execution model

Tasks are stored in a max-heap priority queue. When a worker slot is available, the highest-priority task is dequeued and started. Tasks with the same priority are processed in FIFO order within that priority level.

```ts
const executor = new PriorityPoolExecutor(1);

executor.exec(async () => "low", { priority: 1 });
executor.exec(async () => "high", { priority: 10 });
executor.exec(async () => "medium", { priority: 5 });

// Processing order: high (10), medium (5), low (1)
```

## Error handling

If a task throws, the task's promise rejects with that error. The executor continues processing remaining tasks.

## Cancellation

### Executor-level cancellation

Calling `cancel()` cancels matching tasks. To permanently disable the executor, call `shutdown()`.

### Selective cancellation by kind

```ts
executor.exec(async () => "important", { kind: "critical" });
executor.exec(async () => "background", { kind: "batch" });

// Cancel only batch tasks
executor.cancel({ kind: "batch" });
```

## TypeScript tips

`exec` is generic over `T`.

```ts
const result = await executor.exec(
  async (token) => {
    const res = await token.wrap(fetch("/api/data"));
    return res.json() as Promise<{ id: number }>;
  },
  { priority: 5 },
); // { id: number }
```

## Related APIs

- [`PoolTaskExecutor`](/reference/executors/pool-task-executor/) — pool without priority.
- [`SeriesTaskExecutor`](/reference/executors/series-task-executor/) — sequential executor.
- [`priorityQueue`](/reference/control-flow/priority-queue/) — queue with priority support.
- [`ITaskExecutor`](/reference/executors/itask-executor/) — common executor interface.
