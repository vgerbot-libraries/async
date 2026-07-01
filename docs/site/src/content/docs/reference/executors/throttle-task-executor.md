---
title: ThrottleTaskExecutor
description: A task executor that guarantees a task is executed at most once per wait period.
---

`ThrottleTaskExecutor` ensures that a task is executed at most once per specified wait period. It wraps `DebounceTaskExecutor` with `leading: true` and `trailing: true` options.

> **Best for throttle control**
> Use `ThrottleTaskExecutor` when you need to limit how often a task can run, regardless of how many times it's called.

## Import

Root package:

```ts
import { ThrottleTaskExecutor } from "@vgerbot/async";
```

Module subpath:

```ts
import { ThrottleTaskExecutor } from "@vgerbot/async/executors";
```

Leaf subpath:

```ts
import { ThrottleTaskExecutor } from "@vgerbot/async/executors/ThrottleTaskExecutor";
```

## Quick example

```ts
import { ThrottleTaskExecutor } from "@vgerbot/async";

const executor = new ThrottleTaskExecutor(1000); // At most once per second

// Rapid calls
executor.exec(async () => saveData("a")); // Executes immediately (leading)
executor.exec(async () => saveData("b")); // Queued
executor.exec(async () => saveData("c")); // Replaces "b"

// After 1 second, "c" executes (trailing)
```

## When to use `ThrottleTaskExecutor`

- **Scroll/resize handlers**: Limit the rate of expensive layout calculations.
- **Button click handlers**: Prevent rapid double-submits.
- **API call throttling**: Ensure calls don't exceed a certain frequency.
- **Animation frames**: Throttle visual updates to a fixed rate.

## API

```ts
class ThrottleTaskExecutor extends BaseTaskExecutor {
  constructor(wait: number, options?: ThrottleOptions);

  exec<T>(task: AsyncTask<T>, options?: TaskOptions): PromiseLike<T>;
  cancel(reason?: unknown): void;
  isCancelled(): boolean;

  flush(): void;
  get pending(): boolean;
}
```

### Constructor

```ts
new ThrottleTaskExecutor(wait: number, options?: ThrottleOptions)
```

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `wait` | `number` | — | Minimum milliseconds between executions. |
| `options` | `ThrottleOptions` | `undefined` | Throttle configuration. |

### `ThrottleOptions`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `leading` | `boolean` | `true` | If `true`, execute on the leading edge (first call). |
| `trailing` | `boolean` | `true` | If `true`, execute on the trailing edge (after wait). |

### Methods

#### `exec(task, options?)`

Submits a task. If the throttle period has not elapsed since the last execution, the task is queued (replacing any previously queued task).

#### `flush()`

Immediately executes the pending task if one is queued.

#### `pending` (getter)

Returns `true` if a task is waiting to be executed.

## Execution model

`ThrottleTaskExecutor` wraps `DebounceTaskExecutor` with `leading: true` and `trailing: true`. This means:

1. The first call executes immediately (leading edge).
2. Subsequent calls within the wait period are debounced — only the last one is retained.
3. After the wait period, the retained call executes (trailing edge).

```ts
const executor = new ThrottleTaskExecutor(1000);

executor.exec(async () => log("call 1")); // Executes immediately
executor.exec(async () => log("call 2")); // Queued
executor.exec(async () => log("call 3")); // Replaces "call 2"

// After 1 second: "call 3" executes
```

### Leading only (no trailing)

```ts
const executor = new ThrottleTaskExecutor(1000, { trailing: false });

executor.exec(async () => log("call 1")); // Executes immediately
executor.exec(async () => log("call 2")); // Dropped
executor.exec(async () => log("call 3")); // Dropped

// Only "call 1" executes
```

## Error handling

If a task throws, the task's promise rejects with that error. The executor remains functional for subsequent tasks.

## Cancellation

### Executor-level cancellation

Calling `cancel()` permanently disables the executor. The pending task is cleared.

```ts
executor.exec(async () => saveData());
executor.cancel("Component unmounted");
```

### Flush before cancel

```ts
executor.flush();
executor.cancel();
```

## TypeScript tips

`exec` is generic over `T`.

```ts
const result = await executor.exec(async (token) => {
  const res = await token.wrap(fetch("/api/track"));
  return res.json() as Promise<{ ok: boolean }>;
}).promise;
```

## Related APIs

- [`DebounceTaskExecutor`](/reference/executors/debounce-task-executor/) — delays execution until calls stop.
- [`throttle`](/reference/utils/throttle/) — function-level throttle utility.
- [`debounce`](/reference/utils/debounce/) — function-level debounce utility.
- [`RateLimitExecutor`](/reference/executors/rate-limit-executor/) — rate-limited executor.
- [`ITaskExecutor`](/reference/executors/itask-executor/) — common executor interface.
