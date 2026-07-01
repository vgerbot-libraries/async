---
title: ITaskExecutor
description: Common interface for all task executors in @vgerbot/async.
---

`ITaskExecutor` is the common interface implemented by all task executors. It defines the contract for submitting, cancelling, and querying tasks.

> **Foundation interface**
> All executors (`PoolTaskExecutor`, `SeriesTaskExecutor`, `PriorityPoolExecutor`, `RateLimitExecutor`, `CircuitBreakerExecutor`, `DebounceTaskExecutor`, `ThrottleTaskExecutor`) implement this interface.

## Import

Root package:

```ts
import { ITaskExecutor } from "@vgerbot/async";
```

Module subpath:

```ts
import { ITaskExecutor } from "@vgerbot/async/executors";
```

Leaf subpath:

```ts
import { ITaskExecutor } from "@vgerbot/async/executors/ITaskExecutor";
```

## Quick example

```ts
import { ITaskExecutor, PoolTaskExecutor } from "@vgerbot/async";

function runTasks(executor: ITaskExecutor) {
  return executor.exec(async (token) => {
    await token.sleep(100);
    return "done";
  });
}

const pool = new PoolTaskExecutor(3);
const result = await runTasks(pool);
```

## API

```ts
interface ITaskExecutor {
  cancel(reason?: unknown): void;
  cancel(options: TaskCancelOptions): void;
  cancel(reason: unknown, options: TaskCancelOptions): void;
  isCancelled(): boolean;
  exec<T>(task: AsyncTask<T>, options?: TaskOptions): PromiseLike<T>;
}
```

### Methods

#### `exec(task, options?)`

Submits a task for execution. The scheduling behavior depends on the executor implementation.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `task` | `AsyncTask<T>` | — | Async function that receives a `CancellableToken`. |
| `options` | `TaskOptions` | `undefined` | Task metadata. |

Returns a `PromiseLike<T>` that resolves when the task completes.

#### `cancel(reason?)` / `cancel(options)` / `cancel(reason, options)`

Cancels the executor. Supports three overloads:

- `cancel()` — cancel all tasks with no reason.
- `cancel(reason)` — cancel all tasks with a reason.
- `cancel({ kind })` — selectively cancel tasks by kind.
- `cancel(reason, { kind })` — selectively cancel tasks by kind with a reason.

#### `isCancelled()`

Returns `true` if the executor has been permanently cancelled.

## Related types

### `TaskOptions`

```ts
interface TaskOptions {
  readonly kind?: string;
  readonly name?: string;
  readonly metadata?: Record<string, unknown>;
}
```

| Field | Type | Description |
| --- | --- | --- |
| `kind` | `string` | Group identifier for selective cancellation. |
| `name` | `string` | Human-readable label for debugging. |
| `metadata` | `Record<string, unknown>` | Arbitrary metadata attached to the task. |

### `TaskCancelOptions`

```ts
interface TaskCancelOptions {
  readonly kind?: string | string[];
  readonly reason?: unknown;
}
```

| Field | Type | Description |
| --- | --- | --- |
| `kind` | `string \| string[]` | Cancel only tasks with this kind(s). |
| `reason` | `unknown` | Cancellation reason. |

## Selective cancellation

Tasks can be tagged with a `kind` and selectively cancelled:

```ts
const executor = new PoolTaskExecutor(5);

executor.exec(async () => "critical", { kind: "critical" });
executor.exec(async () => "background", { kind: "background" });
executor.exec(async () => "background-2", { kind: "background" });

// Cancel only background tasks
executor.cancel({ kind: "background" });

// Cancel multiple kinds
executor.cancel({ kind: ["background", "low-priority"] });
```

## Implementations

| Executor | Description |
| --- | --- |
| [`PoolTaskExecutor`](/reference/executors/pool-task-executor/) | Concurrency-limited pool. |
| [`SeriesTaskExecutor`](/reference/executors/series-task-executor/) | Sequential execution (concurrency 1). |
| [`PriorityPoolExecutor`](/reference/executors/priority-pool-executor/) | Pool with priority scheduling. |
| [`RateLimitExecutor`](/reference/executors/rate-limit-executor/) | Rate-limited execution. |
| [`CircuitBreakerExecutor`](/reference/executors/circuit-breaker-executor/) | Circuit breaker pattern. |
| [`DebounceTaskExecutor`](/reference/executors/debounce-task-executor/) | Debounced execution. |
| [`ThrottleTaskExecutor`](/reference/executors/throttle-task-executor/) | Throttled execution. |

## TypeScript tips

Use `ITaskExecutor` as a type constraint when writing functions that accept any executor:

```ts
function withExecutor<T>(executor: ITaskExecutor, task: AsyncTask<T>): PromiseLike<T> {
  return executor.exec(task);
}
```

## Related APIs

- [`BaseTaskExecutor`](/reference/executors/base-task-executor/) — abstract base class for executors.
- [`PoolTaskExecutor`](/reference/executors/pool-task-executor/) — the primary executor implementation.
- [`cancellable`](/reference/cancellable/) — the primitive underlying all executors.
