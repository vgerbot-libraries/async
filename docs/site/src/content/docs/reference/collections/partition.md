---
title: partition
description: Split a collection into two arrays based on an async predicate.
---

`partition` evaluates an async predicate for each item and returns a tuple `[truthy, falsy]` where `truthy` contains items that passed and `falsy` contains items that failed.

> **Best for bifurcation**
> Use `partition` when you need to split a collection into two groups based on an async condition.

## Import

Root package:

```ts
import { partition } from "@vgerbot/async";
```

Module subpath:

```ts
import { partition } from "@vgerbot/async/collections";
```

Leaf subpath:

```ts
import { partition } from "@vgerbot/async/collections/partition";
```

## Quick example

```ts
import { partition } from "@vgerbot/async";

const handle = partition(
  [1, 2, 3, 4, 5],
  async (item) => item % 2 === 0,
);

const [evens, odds] = await handle; // [[2, 4], [1, 3, 5]]
```

## When to use `partition`

- **Bifurcation**: Split items into pass/fail groups.
- **Validation separation**: Separate valid and invalid items.
- **Work distribution**: Route items to different processing pipelines.
- **Filtering with retention**: Keep both matching and non-matching items.

## API

```ts
// Array input
function partition<I>(
  data: I[] | Promise<I[]>,
  predicate: (item: I, token: CancellableToken) => Promise<boolean>,
  options?: PartitionOptions<I>,
): CancellableHandle<[I[], I[]]>;

// Object input
function partition<I>(
  data: CollectionInput<I> | Promise<CollectionInput<I>>,
  predicate: (item: I, key: number | string, token: CancellableToken) => Promise<boolean>,
  options?: PartitionOptions<I>,
): CancellableHandle<[I[], I[]]>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `I[]` or `Record<string, I>` | — | Input collection. Can be a Promise. |
| `predicate` | `(item, token) => Promise<boolean>` or `(item, key, token) => Promise<boolean>` | — | Async predicate. Return `true` for the first group, `false` for the second. |
| `options` | `PartitionOptions<I>` | `undefined` | Configuration options. |

### `PartitionOptions`

`PartitionOptions` extends `CancellableOptions<[I[], I[]]>` with:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `Infinity` | Maximum number of concurrent predicate evaluations. |

### Return value

Returns a `CancellableHandle<[I[], I[]]>` — a tuple of `[truthyItems, falsyItems]`.

## Execution model

All predicates are evaluated (with optional concurrency limit), then items are split into two arrays based on the results. Order within each group follows the original input order.

## Error handling

If any predicate rejects, `partition` rejects with the first error.

## Cancellation

All evaluations share a single `CancellableToken`. Calling `cancel()` signals cancellation.

## TypeScript tips

The return type is a tuple `[I[], I[]]`. Use destructuring for clean access:

```ts
const [passed, failed] = await partition(
  items,
  async (item) => item.isValid,
);
```

## Related APIs

- [`filter`](/reference/collections/filter/) returns only matching items.
- [`reject`](/reference/collections/reject/) returns only non-matching items.
- [`groupBy`](/reference/collections/group-by/) groups by computed keys (more than two groups).
- [`pick`](/reference/collections/pick/) filters object properties.
