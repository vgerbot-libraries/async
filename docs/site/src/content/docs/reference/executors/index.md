---
title: Executors
description: Reusable task schedulers for pooling, priority, rate limiting, circuit breaking, debounce, and throttle behavior.
---

Executors accept task functions through a shared `exec()` API and apply a scheduling policy. They are useful when several call sites should share the same concurrency, ordering, or protection rules.

## Import

```ts
import { PoolTaskExecutor, RateLimitExecutor } from "@vgerbot/async";
```

```ts
import { PoolTaskExecutor } from "@vgerbot/async/executors";
```

## Common interface

```ts
interface ITaskExecutor {
  cancel(reason?: unknown): void;
  cancel(options: TaskCancelOptions): void;
  cancel(reason: unknown, options: TaskCancelOptions): void;
  isCancelled(): boolean;
  shutdown(reason?: unknown): void;
  exec<T>(task: AsyncTask<T>, options?: TaskOptions): TaskHandle<T>;
}
```

## APIs

| API | Description |
| --- | --- |
| [`ITaskExecutor`](/reference/executors/itask-executor/) | Common executor interface. |
| [`PoolTaskExecutor`](/reference/executors/pool-task-executor/) | Runs submitted tasks with fixed concurrency. |
| [`SeriesTaskExecutor`](/reference/executors/series-task-executor/) | Runs submitted tasks one at a time in order. |
| [`PriorityPoolExecutor`](/reference/executors/priority-pool-executor/) | Runs queued tasks by priority with pool concurrency. |
| [`RateLimitExecutor`](/reference/executors/rate-limit-executor/) | Limits how many tasks can start within a time window. |
| [`CircuitBreakerExecutor`](/reference/executors/circuit-breaker-executor/) | Stops calls temporarily when failures exceed a threshold. |
| [`DebounceTaskExecutor`](/reference/executors/debounce-task-executor/) | Debounces task execution. |
| [`ThrottleTaskExecutor`](/reference/executors/throttle-task-executor/) | Throttles task execution. |

## Task options

`TaskOptions` lets callers label submitted work.

| Option | Description |
| --- | --- |
| `kind` | Grouping key used by selective cancellation where supported. |
| `name` | Human-readable task label for debugging and observability. |
| `metadata` | Additional caller-provided task metadata. |

## Related APIs

- [`ITaskExecutor`](/reference/executors/itask-executor/)
- [`PoolTaskExecutor`](/reference/executors/pool-task-executor/)
- [Concurrency Patterns](/guides/concurrency-patterns/)
- [`queue`](/reference/control-flow/queue/)
