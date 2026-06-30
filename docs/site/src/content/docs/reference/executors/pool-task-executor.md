---
title: PoolTaskExecutor
description: Run submitted async tasks through a fixed-size worker pool with shared cancellation semantics.
---

`PoolTaskExecutor` executes submitted task functions with a fixed concurrency limit. Use it when different call sites should share the same pool capacity instead of creating independent queues or `Promise.all()` bursts.

> **Best for shared concurrency limits**
> Use `PoolTaskExecutor` for API clients, background processors, or service adapters that need one shared concurrency budget across many callers.

## Import

Root package:

```ts
import { PoolTaskExecutor } from "@vgerbot/async";
```

Module subpath:

```ts
import { PoolTaskExecutor } from "@vgerbot/async/executors";
```

Leaf subpath:

```ts
import { PoolTaskExecutor } from "@vgerbot/async/executors/PoolTaskExecutor";
```

## Quick example

```ts
import { PoolTaskExecutor } from "@vgerbot/async";

const pool = new PoolTaskExecutor(2);

const user = pool.exec(async (token) => {
  const response = await token.wrap(fetch("/api/users/1"));
  return response.json();
}, { kind: "user", name: "load-user" });

const posts = pool.exec(async (token) => {
  const response = await token.wrap(fetch("/api/users/1/posts"));
  return response.json();
}, { kind: "posts", name: "load-posts" });

const result = await Promise.all([user, posts]);
console.log(result);
```

## When to use `PoolTaskExecutor`

- **Shared pool**: Multiple modules submit work to the same concurrency limit.
- **Task functions**: Callers submit arbitrary async tasks instead of task payloads for a fixed worker.
- **Cancellation groups**: Pending tasks can be labelled with `kind` for selective cancellation.
- **Executor abstraction**: Code can depend on `ITaskExecutor` and swap scheduling policies later.

## API

```ts
class PoolTaskExecutor extends BaseTaskExecutor {
  constructor(concurrency: number);
  exec<T>(task: AsyncTask<T>, options?: TaskOptions): Promise<T>;
  cancel(reason?: unknown): void;
  cancel(options: TaskCancelOptions): void;
  cancel(reason: unknown, options: TaskCancelOptions): void;
  isCancelled(): boolean;
}
```

### Constructor

```ts
new PoolTaskExecutor(concurrency: number)
```

| Parameter | Type | Description |
| --- | --- | --- |
| `concurrency` | `number` | Number of worker loops created for the executor. |

### `exec(task, options)`

Submits a task to the pool and returns a promise for that task result.

```ts
type AsyncTask<T> = (token: CancellableToken) => Promise<T>;
```

| Parameter | Type | Description |
| --- | --- | --- |
| `task` | `AsyncTask<T>` | Async function that receives a `CancellableToken`. |
| `options` | `TaskOptions` | Optional task labels and metadata. |

### `TaskOptions`

| Option | Type | Description |
| --- | --- | --- |
| `kind` | `string` | Group key for selective cancellation of matching pending tasks. |
| `name` | `string` | Human-readable task name. |
| `metadata` | `Record<string, unknown>` | Caller-defined metadata. |

### Return value

`exec()` returns `Promise<T>`. The promise resolves with the submitted task result or rejects with the task error.

## Execution model

`PoolTaskExecutor` creates worker loops when constructed.

1. `exec()` checks permanent executor cancellation.
2. The task is queued with its resolved task options.
3. The next available worker dequeues the task.
4. The worker calls the task with a `CancellableToken`.
5. The `exec()` promise resolves or rejects with the task outcome.
6. The worker continues to the next queued task until the executor is cancelled.

```ts
const pool = new PoolTaskExecutor(1);

const first = pool.exec(async () => "first");
const second = pool.exec(async () => "second");

console.log(await first);
console.log(await second);
```

## Error handling

Task errors reject only that task's `exec()` promise. A non-cancellation task error does not permanently cancel the pool.

```ts
const pool = new PoolTaskExecutor(2);

const failed = pool.exec(async () => {
  throw new Error("Request failed");
});

await failed.catch((error) => {
  console.error(error.message);
});

const ok = await pool.exec(async () => "still running");
console.log(ok);
```

## Cancellation

Calling `cancel(reason)` permanently cancels the executor. Future `exec()` calls throw `CancelError`; queued pending tasks reject; worker handles are cancelled.

```ts
const pool = new PoolTaskExecutor(2);

const slow = pool.exec(async (token) => {
  await token.sleep(5_000);
  return "done";
});

pool.cancel("App shutdown");
await slow;
```

Selective cancellation removes matching pending tasks by `kind` without permanently disabling the executor when matches are found.

```ts
const pool = new PoolTaskExecutor(1);

pool.exec(loadUser, { kind: "user" });
pool.exec(loadPosts, { kind: "posts" });

pool.cancel({ kind: "posts", reason: "Posts refreshed" });
```

If no pending task matches a selective cancellation request, the default executor behavior upgrades the request to a full cancellation.

## TypeScript tips

Use `ITaskExecutor` when code should not depend on a specific scheduling policy.

```ts
import type { ITaskExecutor } from "@vgerbot/async";

async function loadWithExecutor(executor: ITaskExecutor) {
  return executor.exec(async (token) => {
    await token.sleep(100);
    return "loaded";
  });
}
```

## Related APIs

- [`queue`](/reference/control-flow/queue/) uses a fixed worker function and exposes lifecycle hooks.
- [Executors](/reference/executors/) lists all executor implementations.
- [Concurrency Patterns](/guides/concurrency-patterns/) compares executor pools with queues and control-flow helpers.
