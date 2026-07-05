---
title: race
description: Run multiple async tasks and settle with the first one to complete.
---

`race` takes multiple async tasks and resolves or rejects with the first one to settle, just like `Promise.race`. The remaining tasks are cancelled.

> **Best for first-to-finish**
> Use `race` when you want the fastest result from multiple alternatives, or when you want to combine a task with a timeout.

## Import

Root package:

```ts
import { race } from "@vgerbot/async";
```

Module subpath:

```ts
import { race } from "@vgerbot/async/control-flow";
```

Leaf subpath:

```ts
import { race } from "@vgerbot/async/control-flow/race";
```

## Quick example

```ts
import { race } from "@vgerbot/async";

const handle = race({},
  async (token) => {
    await token.sleep(100);
    return "fast";
  },
  async (token) => {
    await token.sleep(500);
    return "slow";
  },
);

const result = await handle; // "fast"
```

## When to use `race`

- **Fastest response**: Query multiple sources and use whichever responds first.
- **Timeout patterns**: Race a task against a delay to implement manual timeouts.
- **Redundant operations**: Run the same operation against multiple endpoints.
- **Cancellable alternatives**: Cancel losing tasks automatically.

## API

```ts
function race(
  options: CancellableOptions,
  ...args: AsyncTask<unknown>[]
): CancellableHandle<unknown>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `options` | `CancellableOptions` | — | Cancellable configuration options. |
| `...args` | `AsyncTask<T>[]` | — | Rest parameters of async tasks to race. Each receives a `CancellableToken`. |

### Return value

Returns a `CancellableHandle<T>` that resolves or rejects with the first task to settle.

```ts
const handle = race({}, task1, task2);

const result = await handle;
handle.cancel("No longer needed");
handle.isCancelled();
handle.signal;
```

## Execution model

`race` wraps `Promise.race` with cancellation support. All tasks start concurrently and share a `CancellableToken`. When the first task settles, the handle adopts its result. The other tasks receive a cancellation signal.

```ts
const handle = race({},
  async (token) => {
    await token.sleep(50);
    return "quick";
  },
  async (token) => {
    await token.sleep(5000);
    return "very slow";
  },
);

// Resolves with "quick" after 50ms
// The second task is cancelled
```

## Error handling

If the first task to settle rejects, the handle rejects with that error. Tasks that settle later are ignored.

```ts
try {
  await race({},
    async () => { throw new Error("immediate failure"); },
    async (token) => { await token.sleep(100); return "late success"; },
  );
} catch (error) {
  console.log("Race failed:", error);
}
```

## Cancellation

Calling `cancel()` on the handle cancels all participating tasks.

```ts
const handle = race({ name: "raceOperation" },
  async (token) => { await token.sleep(5000); return "result"; },
);

setTimeout(() => handle.cancel("User cancelled"), 100);
```

## TypeScript tips

`race` is generic over `T`. All tasks must return the same type.

```ts
const handle = race({},
  async () => 1,
  async () => 2,
);

const result = await handle; // number
```

## Related APIs

- [`any`](/reference/control-flow/any/) resolves with the first task to fulfill (ignores rejections).
- [`allSettled`](/reference/control-flow/all-settled/) waits for all tasks to settle.
- [`parallel`](/reference/control-flow/parallel/) runs all tasks and collects all results.
- [`timeout`](/reference/control-flow/timeout/) wraps a single task with a deadline.
