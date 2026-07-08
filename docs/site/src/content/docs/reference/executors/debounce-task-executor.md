---
title: DebounceTaskExecutor
description: A task executor that delays task invocation until after a wait period since the last exec call.
---

`DebounceTaskExecutor` delays task execution until after a specified wait period has elapsed since the last `exec` call. If multiple calls are made within the wait period, only the last task is executed.

> **Best for debounced execution**
> Use `DebounceTaskExecutor` when you want to coalesce rapid successive task submissions into a single execution.

## Import

Root package:

```ts
import { DebounceTaskExecutor } from "@vgerbot/async";
```

Module subpath:

```ts
import { DebounceTaskExecutor } from "@vgerbot/async/executors";
```

Leaf subpath:

```ts
import { DebounceTaskExecutor } from "@vgerbot/async/executors/DebounceTaskExecutor";
```

## Quick example

```ts
import { DebounceTaskExecutor } from "@vgerbot/async";

const executor = new DebounceTaskExecutor(300); // 300ms wait

// Rapid calls — only the last one executes
executor.exec(async () => saveDraft("version 1"));
executor.exec(async () => saveDraft("version 2"));
executor.exec(async () => saveDraft("version 3"));

// After 300ms of no calls, "version 3" is saved
```

## When to use `DebounceTaskExecutor`

- **Autosave**: Debounce save operations while the user is editing.
- **Search-as-you-type**: Wait for the user to stop typing before searching.
- **Resize handlers**: Debounce layout recalculations during window resize.
- **Batch notifications**: Coalesce multiple notifications into one.

## API

```ts
class DebounceTaskExecutor extends BaseTaskExecutor {
  constructor(wait: number, options?: DebounceOptions);

  exec<T>(task: AsyncTask<T>, options?: TaskOptions): TaskHandle<T>;
  cancel(reason?: unknown): void;
  shutdown(reason?: unknown): void;
  isCancelled(): boolean;

  flush(): void;
  get pending(): boolean;
}
```

### Constructor

```ts
new DebounceTaskExecutor(wait: number, options?: DebounceOptions)
```

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `wait` | `number` | — | Wait time in milliseconds. |
| `options` | `DebounceOptions` | `undefined` | Debounce configuration. |

### `DebounceOptions`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `leading` | `boolean` | `false` | If `true`, execute the task on the leading edge (first call) instead of trailing. |
| `trailing` | `boolean` | `true` | If `true`, execute the task on the trailing edge (after wait). |
| `maxWait` | `number` | `undefined` | Maximum wait time. The task is executed after this duration even if calls continue. |

### Methods

#### `exec(task, options?)`

Submits a task. Previous pending tasks are cancelled. The new task is scheduled to execute after the wait period.

#### `flush()`

Immediately executes the pending task if one is queued, without waiting for the debounce timer.

```ts
executor.exec(async () => saveData());
executor.flush(); // Execute now, don't wait
```

#### `pending` (getter)

Returns `true` if a task is waiting to be executed.

```ts
if (executor.pending) {
  console.log("Task is waiting...");
}
```

## Execution model

1. When `exec` is called, any pending task timer is cleared.
2. A new timer is started with the `wait` duration.
3. If `leading` is `true` and this is the first call in a debounce cycle, the task executes immediately.
4. When the timer fires (and `trailing` is `true`), the task executes.
5. If `maxWait` is set, the task executes after `maxWait` even if calls continue.

### Leading + trailing

```ts
const executor = new DebounceTaskExecutor(300, {
  leading: true,
  trailing: true,
});

// First call executes immediately (leading)
// Subsequent calls within 300ms are debounced
// Last call within the window executes after 300ms (trailing)
```

## Error handling

If a task throws, the task's promise rejects with that error. The executor remains functional for subsequent tasks.

## Cancellation

### Executor-level cancellation

Calling `cancel()` cancels current/pending tasks. The pending task timer is cleared, and the pending task is rejected.

```ts
executor.exec(async () => saveData());
executor.cancel("Component unmounted");
```

### Flush before cancel

```ts
// Execute any pending task before shutting down
executor.flush();
executor.shutdown();
```

## TypeScript tips

`exec` is generic over `T`.

```ts
const result = await executor.exec(async (token) => {
  return fetch("/api/search").then((r) => r.json()) as Promise<SearchResult>;
});
```

## Related APIs

- [`ThrottleTaskExecutor`](/reference/executors/throttle-task-executor/) — guarantees at most one execution per wait period.
- [`debounce`](/reference/utils/debounce/) — function-level debounce utility.
- [`throttle`](/reference/utils/throttle/) — function-level throttle utility.
- [`RateLimitExecutor`](/reference/executors/rate-limit-executor/) — rate-limited executor.
- [`ITaskExecutor`](/reference/executors/itask-executor/) — common executor interface.
