---
title: allSettled
description: Run multiple async tasks and collect all outcomes, whether fulfilled or rejected.
---

`allSettled` runs multiple async tasks concurrently and resolves with an array of outcome objects after all tasks have settled. It is the cancellable equivalent of `Promise.allSettled`.

> **Best for comprehensive results**
> Use `allSettled` when you want to know the outcome of every task, regardless of whether it succeeded or failed.

## Import

Root package:

```ts
import { allSettled } from "@vgerbot/async";
```

Module subpath:

```ts
import { allSettled } from "@vgerbot/async/control-flow";
```

Leaf subpath:

```ts
import { allSettled } from "@vgerbot/async/control-flow/allSettled";
```

## Quick example

```ts
import { allSettled } from "@vgerbot/async";

const handle = allSettled({},
  async () => "success",
  async () => { throw new Error("fail"); },
  async () => 42,
);

const outcomes = await handle;
// [
//   { status: "fulfilled", value: "success" },
//   { status: "rejected", reason: Error("fail") },
//   { status: "fulfilled", value: 42 },
// ]
```

## When to use `allSettled`

- **Batch operations**: Run multiple operations and collect all results, including failures.
- **Best-effort fetching**: Fetch from multiple sources and use whatever succeeds.
- **Error reporting**: Get a complete picture of which operations succeeded and which failed.
- **Cleanup verification**: Run cleanup tasks and verify their outcomes.

## API

```ts
function allSettled(
  options: CancellableOptions<unknown[]>,
  ...tasks: AsyncTask<unknown>[]
): CancellableHandle<PromiseSettledResult<unknown>[]>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `options` | `CancellableOptions<unknown[]>` | — | Cancellable configuration options. |
| `...tasks` | `AsyncTask<T>[]` | — | Rest parameters of async tasks to execute. Each receives a `CancellableToken`. |

### Return value

Returns a `CancellableHandle<PromiseSettledResult<T>[]>` that resolves to an array of outcome objects.

Each outcome is either:

- `{ status: "fulfilled", value: T }` — task succeeded
- `{ status: "rejected", reason: unknown }` — task failed

```ts
const handle = allSettled({}, task1, task2, task3);

const outcomes = await handle;
handle.cancel("No longer needed");
handle.isCancelled();
handle.signal;
```

## Execution model

All tasks start concurrently and share a `CancellableToken`. The handle resolves only after every task has settled (either fulfilled or rejected). Results are in the same order as the input tasks.

```ts
const handle = allSettled({},
  async (token) => { await token.sleep(100); return "a"; },
  async (token) => { throw new Error("b failed"); },
  async (token) => { await token.sleep(50); return "c"; },
);

const outcomes = await handle;
// outcomes[0] = { status: "fulfilled", value: "a" }
// outcomes[1] = { status: "rejected", reason: Error("b failed") }
// outcomes[2] = { status: "fulfilled", value: "c" }
```

## Error handling

`allSettled` never rejects due to task failures—it always resolves with the full set of outcomes. Individual failures are captured as `{ status: "rejected", reason }` entries.

```ts
const outcomes = await allSettled({},
  async () => "ok",
  async () => { throw new Error("fail"); },
);

const successes = outcomes
  .filter((o) => o.status === "fulfilled")
  .map((o) => (o as PromiseFulfilledResult<string>).value);

const failures = outcomes
  .filter((o) => o.status === "rejected")
  .map((o) => (o as PromiseRejectedResult).reason);
```

## Cancellation

Calling `cancel()` on the handle cancels all participating tasks. If cancelled, the handle rejects with a `CancelError` rather than returning partial results.

```ts
const handle = allSettled(
  { name: "batchFetch" },
  ...Array.from({ length: 10 }, (_, i) =>
    async (token) => { await token.sleep(1000); return i; }
  ),
);

setTimeout(() => handle.cancel("User navigated away"), 100);

try {
  await handle;
} catch (error) {
  if (error instanceof CancelError) {
    console.log("Batch was cancelled");
  }
}
```

## TypeScript tips

`allSettled` uses the standard `PromiseSettledResult<T>` type from the TypeScript standard library.

```ts
const outcomes = await allSettled({},
  async () => 1,
  async () => "hello",
);
// Type: PromiseSettledResult<number | string>[]
```

Use type guards to narrow the union:

```ts
for (const outcome of outcomes) {
  if (outcome.status === "fulfilled") {
    console.log(outcome.value); // T
  } else {
    console.error(outcome.reason); // unknown
  }
}
```

## Related APIs

- [`parallel`](/reference/control-flow/parallel/) runs all tasks and rejects on first failure.
- [`any`](/reference/control-flow/any/) resolves with the first task to fulfill.
- [`race`](/reference/control-flow/race/) settles with the first task to complete.
- [`reflect`](/reference/control-flow/reflect/) wraps a single task to always resolve.
