---
title: map
description: Map over an array or object concurrently with an async callback and optional concurrency limit.
---

`map` applies an async function to each element of a collection and returns an array of results. It supports both arrays and objects, and an optional concurrency limit.

> **Best for async transformations**
> Use `map` when you need to transform each item in a collection asynchronously, such as fetching data for each ID or processing files.

## Import

Root package:

```ts
import { map } from "@vgerbot/async";
```

Module subpath:

```ts
import { map } from "@vgerbot/async/collections";
```

Leaf subpath:

```ts
import { map } from "@vgerbot/async/collections/map";
```

## Quick example

```ts
import { map } from "@vgerbot/async";

// Array input
const handle = map(
  [1, 2, 3],
  async (item, token) => {
    await token.sleep(10);
    return item * 2;
  },
  { concurrency: 2 },
);

const result = await handle.promise; // [2, 4, 6]
```

Object input:

```ts
const handle = map(
  { a: 1, b: 2 },
  async (value, key, token) => `${key}:${value * 10}`,
);

const result = await handle.promise; // ["a:10", "b:20"]
```

## When to use `map`

- **Async transformations**: Apply an async operation to each item in a collection.
- **Batch fetching**: Fetch data for each ID in a list with controlled concurrency.
- **Object mapping**: Transform values of an object while accessing keys.
- **Controlled concurrency**: Limit simultaneous operations to avoid overwhelming resources.

## API

```ts
// Array input
function map<I, R>(
  data: I[] | Promise<I[]>,
  callbackfn: (item: I, token: CancellableToken) => Promise<R>,
  options?: MapOptions<R>,
): CancellableHandle<R[]>;

// Object input
function map<I, R>(
  data: CollectionInput<I> | Promise<CollectionInput<I>>,
  callbackfn: (item: I, key: number | string, token: CancellableToken) => Promise<R>,
  options?: MapOptions<R>,
): CancellableHandle<R[]>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `I[]` or `Record<string, I>` | — | Input collection (array or object). Can be a Promise that resolves to the collection. |
| `callbackfn` | `(item, token) => Promise<R>` or `(item, key, token) => Promise<R>` | — | Async function applied to each item. For arrays, receives `(item, token)`. For objects, receives `(item, key, token)`. |
| `options` | `MapOptions<R>` | `undefined` | Configuration options. |

### `MapOptions`

`MapOptions` extends `CancellableOptions<R[]>` with:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `Infinity` | Maximum number of concurrent operations. |

### Return value

Returns a `CancellableHandle<R[]>` that resolves to an array of mapped values in the original order.

## Execution model

When `concurrency` is finite, `map` uses a slot-filling approach: as soon as one operation completes, the next item starts processing. Results are always in the same order as the input, regardless of completion order.

Without a concurrency limit, all items are processed simultaneously (equivalent to `Promise.all`).

## Error handling

If any callback rejects, `map` rejects with the first error. Other in-flight operations are not cancelled automatically.

```ts
try {
  await map([1, 2, 3], async (item) => {
    if (item === 2) throw new Error("fail");
    return item;
  }).promise;
} catch (error) {
  console.log("map failed:", error);
}
```

## Cancellation

All operations share a single `CancellableToken`. Calling `cancel()` signals cancellation to all running operations.

```ts
const handle = map(
  largeArray,
  async (item, token) => {
    await token.sleep(100);
    return processItem(item);
  },
  { concurrency: 5, name: "batchMap" },
);

setTimeout(() => handle.cancel("User navigated away"), 500);
```

## TypeScript tips

The callback signature differs based on input type. For arrays, it receives `(item, token)`. For objects, it receives `(item, key, token)`.

```ts
// Array: (item, token) => Promise<R>
const handle1 = map([1, 2, 3], async (n, token) => n * 2);

// Object: (item, key, token) => Promise<R>
const handle2 = map(
  { a: 1, b: 2 },
  async (value, key, token) => `${key}:${value}`,
);
```

## Related APIs

- [`each`](/reference/collections/each/) iterates for side effects without collecting results.
- [`filter`](/reference/collections/filter/) filters items based on an async predicate.
- [`concat`](/reference/collections/concat/) maps and flattens results.
- [`mapValues`](/reference/collections/map-values/) maps object values while preserving keys.
- [`parallel`](/reference/control-flow/parallel/) runs an array of different tasks concurrently.
