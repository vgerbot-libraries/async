---
title: groupBy
description: Group collection items by an asynchronously computed key.
---

`groupBy` computes a group key for each item using an async function and returns an object mapping keys to arrays of items.

> **Best for categorization**
> Use `groupBy` when you need to categorize items into groups based on an async computation.

## Import

Root package:

```ts
import { groupBy } from "@vgerbot/async";
```

Module subpath:

```ts
import { groupBy } from "@vgerbot/async/collections";
```

Leaf subpath:

```ts
import { groupBy } from "@vgerbot/async/collections/groupBy";
```

## Quick example

```ts
import { groupBy } from "@vgerbot/async";

const handle = groupBy(
  [1, 2, 3, 4],
  async (item, token) => {
    await token.sleep(5);
    return item % 2 === 0 ? "even" : "odd";
  },
  { concurrency: 2 },
);

const result = await handle.promise; // { odd: [1, 3], even: [2, 4] }
```

## When to use `groupBy`

- **Categorization**: Group items by type, status, or any computed key.
- **Batching**: Group items by batch for parallel processing.
- **Partitioning by dynamic keys**: Split items into more than two groups.
- **Async key computation**: When the group key requires an async lookup.

## API

```ts
// Array input
function groupBy<I>(
  data: I[] | Promise<I[]>,
  keySelector: (item: I, token: CancellableToken) => Promise<PropertyKey>,
  options?: GroupByOptions<I>,
): CancellableHandle<Record<string, I[]>>;

// Object input
function groupBy<I>(
  data: CollectionInput<I> | Promise<CollectionInput<I>>,
  keySelector: (item: I, key: number | string, token: CancellableToken) => Promise<PropertyKey>,
  options?: GroupByOptions<I>,
): CancellableHandle<Record<string, I[]>>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `I[]` or `Record<string, I>` | — | Input collection. Can be a Promise. |
| `keySelector` | `(item, token) => Promise<PropertyKey>` or `(item, key, token) => Promise<PropertyKey>` | — | Async function that returns the group key for each item. |
| `options` | `GroupByOptions<I>` | `undefined` | Configuration options. |

### `GroupByOptions`

`GroupByOptions` extends `CancellableOptions<Record<string, I[]>>` with:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `Infinity` | Maximum number of concurrent key computations. |

### Return value

Returns a `CancellableHandle<Record<string, I[]>>` that resolves to an object where each key maps to an array of items in that group.

## Execution model

All key selectors are evaluated (with optional concurrency limit), then items are grouped by their computed keys. The result object's keys are the stringified `PropertyKey` values returned by the selector.

## Error handling

If any key selector rejects, `groupBy` rejects with the first error.

## Cancellation

All evaluations share a single `CancellableToken`. Calling `cancel()` signals cancellation.

## TypeScript tips

The return type is always `Record<string, I[]>`. Keys are stringified versions of the `PropertyKey` returned by the selector.

```ts
const handle = groupBy(
  users,
  async (user) => user.role, // PropertyKey (string | number | symbol)
);

const groups = await handle.promise; // Record<string, User[]>
```

## Related APIs

- [`partition`](/reference/collections/partition/) splits into exactly two groups.
- [`sortBy`](/reference/collections/sort-by/) sorts items by an async key.
- [`map`](/reference/collections/map/) transforms items.
- [`transform`](/reference/collections/transform/) builds a custom accumulator.
