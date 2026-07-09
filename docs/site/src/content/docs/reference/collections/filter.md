---
title: filter
description: Filter a collection asynchronously using a predicate function.
---

`filter` applies an async predicate to each item in a collection and returns an array of items that passed the predicate. It supports both arrays and objects, and an optional concurrency limit.

> **Best for async filtering**
> Use `filter` when you need to check each item asynchronously to decide whether to keep it.

## Import

Root package:

```ts
import { filter } from "@vgerbot/async";
```

Module subpath:

```ts
import { filter } from "@vgerbot/async/collections";
```

Leaf subpath:

```ts
import { filter } from "@vgerbot/async/collections/filter";
```

## Quick example

```ts
import { filter } from "@vgerbot/async";

const handle = filter(
  [1, 2, 3, 4],
  async (item, token) => {
    await token.sleep(10);
    return item % 2 === 0;
  },
  { concurrency: 2 },
);

const result = await handle; // [2, 4]
```

Object input:

```ts
const handle = filter(
  { a: 1, b: 2, c: 3 },
  async (value, key) => key !== "a" && value >= 2,
);

const result = await handle; // [2, 3]
```

## When to use `filter`

- **Async validation**: Check each item against an async condition (e.g., API lookup).
- **Remote filtering**: Filter items based on data that must be fetched.
- **Object filtering**: Filter object values while accessing keys.
- **Controlled concurrency**: Limit simultaneous predicate evaluations.

## API

```ts
// Array input
function filter<I>(
  data: I[] | Promise<I[]>,
  predicate: (item: I, token: CancellableToken) => Promise<boolean>,
  options?: FilterOptions<I>,
): CancellableHandle<I[]>;

// Object input
function filter<I>(
  data: CollectionInput<I> | Promise<CollectionInput<I>>,
  predicate: (item: I, key: number | string, token: CancellableToken) => Promise<boolean>,
  options?: FilterOptions<I>,
): CancellableHandle<I[]>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `I[]` or `Record<string, I>` | — | Input collection. Can be a Promise. |
| `predicate` | `(item, token) => Promise<boolean>` or `(item, key, token) => Promise<boolean>` | — | Async predicate. Return `true` to keep the item. |
| `options` | `FilterOptions<I>` | `undefined` | Configuration options. |

### `FilterOptions`

`FilterOptions` extends `CancellableOptions<I[]>` with:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `Infinity` | Maximum number of concurrent predicate evaluations. |

### Return value

Returns a `CancellableHandle<I[]>` that resolves to an array of items that passed the predicate, in original order.

## Execution model

When `concurrency` is finite, `filter` uses a slot-filling approach. All predicates are evaluated, and items that pass are collected in original order.

## Error handling

If any predicate rejects, `filter` rejects with the first error.

## Cancellation

All evaluations share a single `CancellableToken`. Calling `cancel()` signals cancellation.

## TypeScript tips

The return type is always `I[]` (an array), even when the input is an object.

```ts
const handle = filter(
  { a: 1, b: 2, c: 3 },
  async (value, key, token) => value > 1,
);

const result = await handle; // number[] → [2, 3]
```

## Related APIs

- [`reject`](/reference/collections/reject/) is the inverse of `filter`.
- [`map`](/reference/collections/map/) transforms items.
- [`partition`](/reference/collections/partition/) splits into two arrays.
- [`pick`](/reference/collections/pick/) filters object properties, returning an object.
