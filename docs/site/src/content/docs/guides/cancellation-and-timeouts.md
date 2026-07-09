---
title: Cancellation and Timeouts
description: Understand the cancellation model shared by cancellable tasks, control-flow helpers, queues, executors, and utilities.
---

Cancellation in `@vgerbot/async` is cooperative. APIs expose a handle that can be cancelled, and running tasks receive a token they can check or use to wrap async work.

## Core model

```ts
import { cancellable } from "@vgerbot/async";

const handle = cancellable(async (token) => {
  await token.sleep(1_000);
  token.throwIfCancelled();
  return "done";
});

handle.cancel("No longer needed");
```

- `CancellableHandle` is returned to the caller.
- `CancellableToken` is passed into the task.
- `CancelError` represents cancellation failures.
- `timeout` can automatically cancel a task after a duration.

## Wrap external promises

Use `token.wrap()` when a task awaits work that should stop observing results after cancellation.

```ts
const handle = cancellable(async (token) => {
  const response = await token.wrap(fetch("/api/profile"));
  return response.json();
});
```

When wrapping another `CancellableHandle`, cancellation is forwarded to the nested handle.

## Sleep and explicit checks

`token.sleep()` creates a cancellable delay. `token.throwIfCancelled()` is useful after expensive work or before committing results.

```ts
const handle = cancellable(async (token) => {
  await token.sleep(500);
  token.throwIfCancelled();
  return "ready";
});
```

## Timeouts

Pass `timeout` to cancel a task automatically.

```ts
const handle = cancellable(
  async (token) => {
    await token.sleep(5_000);
    return "done";
  },
  { name: "slow-task", timeout: 1_000 },
);
```

## Queues and executors

`queue.cancel()` rejects pending work and cancels the shared token observed by running workers.

```ts
const uploads = queue(uploadFile, { concurrency: 2 });
uploads.push(file);
uploads.cancel("Route changed");
```

Executor `cancel()` permanently disables that executor. Some executors also support selective cancellation by task `kind`.

```ts
const executor = new PoolTaskExecutor(2);
executor.exec(loadUser, { kind: "user" });
executor.cancel({ kind: "user", reason: "Refresh requested" });
```

## Related APIs

- [`auto`](/reference/control-flow/auto/) propagates cancellation through dependency tasks.
- [`queue`](/reference/control-flow/queue/) exposes queue-level cancellation.
- [`PoolTaskExecutor`](/reference/executors/pool-task-executor/) documents executor cancellation behavior.
