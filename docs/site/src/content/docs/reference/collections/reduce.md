---
title: reduce
description: Reduce a collection sequentially using an async accumulator function.
---

`reduce` iterates over a collection sequentially, applying an async reducer function that accumulates a result. Unlike `map` and `filter`, `reduce` always processes items one at a time.

> **Best for sequential accumulation**
> Use `reduce` when you need to build up a result from a collection step by step, such as aggregating data or building a composite object.

## Import

Root package:

```ts
import { reduce } from "@vgerbot/async";
```

Module subpath:

```ts
import { reduce } from "@vgerbot/async/collections";
```

Leaf subpath:

```ts
import { reduce } from "@vgerbot/async/collections/reduce";
```

## Quick example

```ts
import { reduce } from "@vgerbot/async";

const handle = reduce(
  [1, 2, 3],
  async (acc, item, token) => {
    await token.sleep(5);
    return acc + item;
  },
  0,
);

const result = await handle.promise; // 6
```

Object input:

```ts
const handle = reduce(
  { a: 1, b: 2 },
  async (acc, value, key, token) => `${acc}${key}=${value};`,
  "",
);

const result = await handle.promise; // "a=1;b=2;"
```

## When to use `reduce`

- **Aggregation**: Sum, count, or combine values from a collection.
- **Sequential building**: Build a result that depends on each item in order.
- **Object accumulation**: Accumulate values from an object with key access.
- **Ordered processing**: When each step depends on the previous result.

## API

```ts
// Array input
function reduce<I, R>(
  data: I[] | Promise<I[]>,
  reducer: (acc: R, item: I, token: CancellableToken) => Promise<R>,
  initialValue: R,
  options?: CancellableOptions,
): CancellableHandle<R>;

// Object input
function reduce<I, R>(
  data: CollectionInput<I> | Promise<CollectionInput<I>>,
  reducer: (acc: R, item: I, key: number | string, token: CancellableToken) => Promise<R>,
  initialValue: R,
  options?: CancellableOptions,
): CancellableHandle<R>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `I[]` or `Record<string, I>` | — | Input collection. Can be a Promise. |
| `reducer` | `(acc, item, token) => Promise<R>` or `(acc, item, key, token) => Promise<R>` | — | Async reducer function. |
| `initialValue` | `R` | — | Initial value for the accumulator. |
| `options` | `CancellableOptions` | `undefined` | Cancellable configuration options. |

### Return value

Returns a `CancellableHandle<R>` that resolves to the final accumulated value.

## Execution model

`reduce` processes items sequentially—there is no `concurrency` option. Each item is processed one at a time, with the accumulator passed from one step to the next.

## Error handling

If the reducer rejects at any step, `reduce` rejects with that error and remaining items are not processed.

## Cancellation

The reducer receives a `CancellableToken`. Calling `cancel()` on the handle signals cancellation.

```ts
const handle = reduce(
  largeArray,
  async (acc, item, token) => {
    token.throwIfCancelled();
    return acc + item;
  },
  0,
  { name: "sumReduce" },
);

setTimeout(() => handle.cancel("User cancelled"), 100);
```

## TypeScript tips

`reduce` is generic over both the input type `I` and the accumulator type `R`. They can be different.

```ts
const handle = reduce(
  [1, 2, 3],
  async (acc: string, item: number, token) => `${acc},${item}`,
  "",
);

const result = await handle.promise; // ",1,2,3"
```

## Related APIs

- [`transform`](/reference/collections/transform/) is similar but allows in-place mutation of the accumulator.
- [`map`](/reference/collections/map/) transforms items concurrently.
- [`each`](/reference/collections/each/) iterates for side effects.
- [`series`](/reference/control-flow/series/) runs tasks sequentially.
