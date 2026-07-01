---
title: whilst
description: Repeat an async task while a condition holds true.
---

`whilst` repeatedly executes an async task as long as a test condition returns true. The library also exports `until`, `doWhilst`, and `doUntil` as related loop constructs.

> **Best for conditional loops**
> Use `whilst` when you need to poll until a condition is met, retry until success, or loop while a resource is available.

## Import

Root package:

```ts
import { whilst, until, doWhilst, doUntil } from "@vgerbot/async";
```

Module subpath:

```ts
import { whilst, until, doWhilst, doUntil } from "@vgerbot/async/control-flow";
```

Leaf subpath:

```ts
import { whilst } from "@vgerbot/async/control-flow/whilst";
```

## Quick example

```ts
import { whilst } from "@vgerbot/async";

let count = 0;

const handle = whilst(
  async () => count < 5,
  async (token) => {
    await token.sleep(100);
    count++;
  },
);

await handle.promise;
console.log(count); // 5
```

## When to use

- **`whilst`**: Check condition first, then run task. Loop while condition is true.
- **`until`**: Check condition first, then run task. Loop until condition is true (opposite of `whilst`).
- **`doWhilst`**: Run task first, then check condition. Loop while condition is true.
- **`doUntil`**: Run task first, then check condition. Loop until condition is true.

## API

```ts
function whilst(
  test: () => Promise<boolean>,
  iteratee: (token: CancellableToken) => Promise<void>,
  options?: CancellableOptions<void>,
): CancellableHandle<void>;

function until(
  test: () => Promise<boolean>,
  iteratee: (token: CancellableToken) => Promise<void>,
  options?: CancellableOptions<void>,
): CancellableHandle<void>;

function doWhilst(
  iteratee: (token: CancellableToken) => Promise<void>,
  test: () => Promise<boolean>,
  options?: CancellableOptions<void>,
): CancellableHandle<void>;

function doUntil(
  iteratee: (token: CancellableToken) => Promise<void>,
  test: () => Promise<boolean>,
  options?: CancellableOptions<void>,
): CancellableHandle<void>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `test` | `() => Promise<boolean>` | — | Async function that determines whether to continue looping. |
| `iteratee` | `(token) => Promise<void>` | — | Async function executed on each iteration. Receives a `CancellableToken`. |
| `options` | `CancellableOptions<void>` | `undefined` | Cancellable configuration options. |

### Return value

Returns a `CancellableHandle<void>` that resolves when the loop completes.

```ts
const handle = whilst(test, iteratee);

await handle.promise;
handle.cancel("No longer needed");
handle.isCancelled();
handle.signal;
```

## Execution model

### `whilst`

1. Call `test()`. If it resolves to `false`, stop.
2. Call `iteratee(token)`.
3. Repeat from step 1.

### `until`

1. Call `test()`. If it resolves to `true`, stop.
2. Call `iteratee(token)`.
3. Repeat from step 1.

### `doWhilst`

1. Call `iteratee(token)`.
2. Call `test()`. If it resolves to `false`, stop.
3. Repeat from step 1.

### `doUntil`

1. Call `iteratee(token)`.
2. Call `test()`. If it resolves to `true`, stop.
3. Repeat from step 1.

```ts
// Polling with whilst
import { whilst } from "@vgerbot/async";

const handle = whilst(
  async () => {
    const status = await fetch("/api/job/status").then((r) => r.json());
    return status.state !== "completed";
  },
  async (token) => {
    await token.sleep(1000); // Poll every second
  },
  { name: "jobPolling" },
);

await handle.promise;
console.log("Job completed");
```

## Error handling

If either `test` or `iteratee` rejects, the loop stops and the handle rejects with that error.

```ts
try {
  await whilst(
    async () => true,
    async () => { throw new Error("iteratee failed"); },
  ).promise;
} catch (error) {
  console.log("Loop failed:", error);
}
```

## Cancellation

The loop checks for cancellation between iterations. Calling `cancel()` on the handle causes the next iteration check to throw a `CancelError`.

```ts
const handle = whilst(
  async () => true,
  async (token) => { await token.sleep(1000); },
  { name: "infinitePoll" },
);

setTimeout(() => handle.cancel("User navigated away"), 5000);

try {
  await handle.promise;
} catch (error) {
  if (error instanceof CancelError) {
    console.log("Loop was cancelled");
  }
}
```

## TypeScript tips

The `iteratee` returns `Promise<void>` — it does not accumulate results. Use `reduce` or `transform` if you need to collect values across iterations.

```ts
// Collecting results with transform instead
import { transform } from "@vgerbot/async";

const results = await transform(
  Array.from({ length: 5 }, (_, i) => i),
  async (acc, i, token) => {
    await token.sleep(10);
    acc.push(i * 2);
  },
  [] as number[],
).promise;
```

## Related APIs

- [`forever`](/reference/control-flow/forever/) runs a task indefinitely until cancelled.
- [`times`](/reference/control-flow/times/) repeats a task a fixed number of times.
- [`retry`](/reference/control-flow/retry/) retries a task on failure.
- [`reduce`](/reference/collections/reduce/) reduces a collection sequentially.
