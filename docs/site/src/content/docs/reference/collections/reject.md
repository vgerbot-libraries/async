---
title: reject
description: Filter out items for which an async predicate returns true.
---

`reject` is the inverse of `filter`. It removes items that match the async predicate and returns the remaining items.

> **Best for exclusion filtering**
> Use `reject` when you need to remove items that match an async condition.

## Import

Root package:

```ts
import { reject } from "@vgerbot/async";
```

Module subpath:

```ts
import { reject } from "@vgerbot/async/collections";
```

Leaf subpath:

```ts
import { reject } from "@vgerbot/async/collections/reject";
```

## Quick example

```ts
import { reject } from "@vgerbot/async";

const handle = reject(
  [1, 2, 3, 4],
  async (item) => item % 2 === 0,
  { concurrency: 2 },
);

const result = await handle; // [1, 3]
```

Object input:

```ts
const handle = reject(
  { a: 1, b: 2, c: 3 },
  async (value, key) => key === "b" || value < 2,
);

const result = await handle; // [3]
```

## When to use `reject`

- **Exclusion filtering**: Remove items that match a condition.
- **Invalid item removal**: Filter out items that fail an async validation.
- **Inverse selection**: When it's easier to describe what to exclude than what to keep.
- **Controlled concurrency**: Limit concurrent predicate evaluations.

## API

```ts
// Array input
function reject<I>(
  data: I[] | Promise<I[]>,
  predicate: (item: I, token: CancellableToken) => Promise<boolean>,
  options?: RejectOptions<I>,
): CancellableHandle<I[]>;

// Object input
function reject<I>(
  data: CollectionInput<I> | Promise<CollectionInput<I>>,
  predicate: (item: I, key: number | string, token: CancellableToken) => Promise<boolean>,
  options?: RejectOptions<I>,
): CancellableHandle<I[]>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `I[]` or `Record<string, I>` | — | Input collection. Can be a Promise. |
| `predicate` | `(item, token) => Promise<boolean>` or `(item, key, token) => Promise<boolean>` | — | Async predicate. Return `true` to remove the item. |
| `options` | `RejectOptions<I>` | `undefined` | Configuration options. |

### `RejectOptions`

`RejectOptions` extends `CancellableOptions<I[]>` with:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `Infinity` | Maximum number of concurrent predicate evaluations. |

### Return value

Returns a `CancellableHandle<I[]>` that resolves to an array of items that did not match the predicate, in original order.

## Execution model

All predicates are evaluated (with optional concurrency limit), then items where the predicate returned `false` are collected in original order.

## Error handling

If any predicate rejects, `reject` rejects with the first error.

## Cancellation

All evaluations share a single `CancellableToken`. Calling `cancel()` signals cancellation.

## TypeScript tips

The return type is always `I[]` (an array), even when the input is an object.

```ts
const handle = reject(
  { a: 1, b: 2, c: 3 },
  async (value, key) => value > 2,
);

const result = await handle; // number[] → [1, 2]
```

## Related APIs

- [`filter`](/reference/collections/filter/) is the inverse — keeps items where predicate is true.
- [`partition`](/reference/collections/partition/) splits into both matching and non-matching groups.
- [`omit`](/reference/collections/omit/) excludes object properties.
- [`map`](/reference/collections/map/) transforms items.
