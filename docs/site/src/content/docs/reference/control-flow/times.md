---
title: times
description: Repeat an async task a specified number of times and collect results.
---

`times` runs an async task a given number of times and collects the results into an array. It supports an optional concurrency limit.

> **Best for repeated operations**
> Use `times` when you need to repeat the same async operation N times and collect all results.

## Import

Root package:

```ts
import { times } from "@vgerbot/async";
```

Module subpath:

```ts
import { times } from "@vgerbot/async/control-flow";
```

Leaf subpath:

```ts
import { times } from "@vgerbot/async/control-flow/times";
```

## Quick example

```ts
import { times } from "@vgerbot/async";

const handle = times(
  5,
  async (index, token) => {
    await token.sleep(10);
    return index * 2;
  },
  { concurrency: 2 },
);

const results = await handle.promise; // [0, 2, 4, 6, 8]
```

## When to use `times`

- **Repeated fetches**: Make N API calls and collect all responses.
- **Batch generation**: Generate multiple items asynchronously.
- **Warm-up**: Pre-populate a cache by running an operation multiple times.
- **Load testing**: Simulate concurrent requests for testing purposes.

## API

```ts
function times<T>(
  count: number,
  iteratee: (index: number, token: CancellableToken) => Promise<T>,
  options?: TimesOptions<T>,
): CancellableHandle<T[]>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `count` | `number` | — | Number of times to run the iteratee. |
| `iteratee` | `(index, token) => Promise<T>` | — | Async function called with the current index (0-based) and a `CancellableToken`. |
| `options` | `TimesOptions<T>` | `undefined` | Configuration options. |

### `TimesOptions`

`TimesOptions` extends `CancellableOptions<T[]>` with:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `Infinity` | Maximum number of concurrent iterations. |
| `name` | `string` | `"times"` | Name used in cancellation labels. |
| `signal` | `AbortSignal` | `undefined` | External signal linked to the operation. |
| `timeout` | `number` | `undefined` | Cancels after the specified milliseconds. |

### Return value

Returns a `CancellableHandle<T[]>` that resolves to an array of results in index order.

```ts
const handle = times(10, myIteratee, { concurrency: 3 });

const results = await handle.promise;
handle.cancel("No longer needed");
handle.isCancelled();
handle.signal;
```

## Execution model

`times` uses a slot-filling concurrency limiter. When `concurrency` is finite, at most N iterations run simultaneously. Results are collected in index order, regardless of completion order.

```ts
// Run 10 iterations with at most 3 concurrent
const handle = times(
  10,
  async (i, token) => {
    await token.sleep(Math.random() * 100);
    return `item-${i}`;
  },
  { concurrency: 3 },
);

const results = await handle.promise;
// ["item-0", "item-1", ..., "item-9"] in order
```

Without a concurrency limit, all iterations start immediately.

## Error handling

If any iteration rejects, `times` rejects with the first error. Other in-flight iterations are not cancelled automatically.

```ts
try {
  await times(5, async (i) => {
    if (i === 2) throw new Error("fail at index 2");
    return i;
  }).promise;
} catch (error) {
  console.log("times failed:", error);
}
```

## Cancellation

All iterations share a single `CancellableToken`. Calling `cancel()` signals cancellation to all running iterations.

```ts
const handle = times(
  100,
  async (i, token) => {
    await token.sleep(1000);
    return i;
  },
  { concurrency: 5, name: "batchGenerate" },
);

setTimeout(() => handle.cancel("User cancelled"), 500);
```

## TypeScript tips

`times` is generic over `T`, so the return type is inferred from the iteratee.

```ts
const handle = times(5, async (i, token) => ({ id: i, name: `item-${i}` }));

const results = await handle.promise; // { id: number; name: string }[]
```

## Related APIs

- [`parallel`](/reference/control-flow/parallel/) runs an array of different tasks concurrently.
- [`map`](/reference/collections/map/) maps over a collection with concurrency control.
- [`forever`](/reference/control-flow/forever/) runs a task indefinitely until cancelled.
- [`whilst`](/reference/control-flow/whilst/) repeats a task while a condition holds.
