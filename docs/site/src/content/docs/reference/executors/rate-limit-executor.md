---
title: RateLimitExecutor
description: A task executor that limits the rate of task execution using a sliding window algorithm.
---

`RateLimitExecutor` enforces a maximum number of task executions per time window. Tasks that exceed the rate limit are queued and executed when the window allows.

> **Best for API rate limiting**
> Use `RateLimitExecutor` when calling APIs with rate limits, such as 100 requests per minute.

## Import

Root package:

```ts
import { RateLimitExecutor } from "@vgerbot/async";
```

Module subpath:

```ts
import { RateLimitExecutor } from "@vgerbot/async/executors";
```

Leaf subpath:

```ts
import { RateLimitExecutor } from "@vgerbot/async/executors/RateLimitExecutor";
```

## Quick example

```ts
import { RateLimitExecutor } from "@vgerbot/async";

// Max 5 requests per second
const executor = new RateLimitExecutor({
  maxRequests: 5,
  windowMs: 1000,
});

for (let i = 0; i < 20; i++) {
  executor.exec(async (token) => {
    return fetch(`/api/data?page=${i}`);
  });
}

// Requests are throttled to 5 per second
```

## When to use `RateLimitExecutor`

- **API rate limits**: Respect rate limits of external APIs.
- **Resource throttling**: Limit the rate of resource-intensive operations.
- **Compliance**: Ensure operations stay within contractual rate limits.
- **Gentle polling**: Space out requests to avoid overwhelming a server.

## API

```ts
class RateLimitExecutor extends BaseTaskExecutor {
  constructor(options: RateLimitOptions);

  exec<T>(task: AsyncTask<T>, options?: TaskOptions): PromiseLike<T>;
  cancel(reason?: unknown): void;
  cancel(options: TaskCancelOptions): void;
  isCancelled(): boolean;
}
```

### Constructor

```ts
new RateLimitExecutor(options: RateLimitOptions)
```

### `RateLimitOptions`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `maxRequests` | `number` | — | Maximum number of requests allowed per time window. |
| `windowMs` | `number` | — | Time window in milliseconds. |

### Methods

#### `exec(task, options?)`

Submits a task for execution. If the rate limit has been reached, the task is queued until the sliding window allows it.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `task` | `AsyncTask<T>` | — | Async function that receives a `CancellableToken`. |
| `options` | `TaskOptions` | `undefined` | Task metadata (kind, name, metadata). |

#### `cancel(reason?)` / `cancel(options)`

Permanently cancels the executor. All pending and queued tasks are rejected.

## Execution model

`RateLimitExecutor` uses a sliding window algorithm. It tracks the timestamps of recent executions within the window. When a new task is submitted:

1. If the number of executions in the current window is below `maxRequests`, the task starts immediately.
2. If the limit is reached, the task is queued and waits until enough timestamps expire from the window.
3. Queued tasks are started in FIFO order as the window slides forward.

```ts
// 3 requests per second
const executor = new RateLimitExecutor({
  maxRequests: 3,
  windowMs: 1000,
});

// First 3 start immediately
// 4th and 5th wait until the window slides
for (let i = 0; i < 5; i++) {
  executor.exec(async () => `request-${i}`);
}
```

## Error handling

If a task throws, the task's promise rejects with that error. The executor continues processing subsequent tasks.

## Cancellation

### Executor-level cancellation

Calling `cancel()` permanently disables the executor. All pending and queued tasks are rejected with `CancelError`.

```ts
const executor = new RateLimitExecutor({ maxRequests: 10, windowMs: 1000 });

executor.exec(async () => "task1");
executor.exec(async () => "task2");

executor.cancel("Shutting down");
```

### Selective cancellation by kind

```ts
executor.exec(async () => "important", { kind: "critical" });
executor.exec(async () => "background", { kind: "batch" });

executor.cancel({ kind: "batch" });
```

## TypeScript tips

`exec` is generic over `T`.

```ts
const result = await executor.exec(async (token) => {
  const res = await token.wrap(fetch("/api/data"));
  return res.json() as Promise<{ items: string[] }>;
}).promise;
```

## Related APIs

- [`ThrottleTaskExecutor`](/reference/executors/throttle-task-executor/) — guarantees at most one execution per wait period.
- [`DebounceTaskExecutor`](/reference/executors/debounce-task-executor/) — delays execution until calls stop.
- [`PoolTaskExecutor`](/reference/executors/pool-task-executor/) — concurrency-limited pool.
- [`throttle`](/reference/utils/throttle/) — function-level throttle.
- [`debounce`](/reference/utils/debounce/) — function-level debounce.
