---
title: sortBy
description: Sort a collection by an asynchronously computed sort key.
---

`sortBy` computes a sort key for each item using an async function and returns the items sorted in ascending order by their computed keys.

> **Best for async sorting**
> Use `sortBy` when the sort key for each item requires an async operation, such as a database lookup or API call.

## Import

Root package:

```ts
import { sortBy } from "@vgerbot/async";
```

Module subpath:

```ts
import { sortBy } from "@vgerbot/async/collections";
```

Leaf subpath:

```ts
import { sortBy } from "@vgerbot/async/collections/sortBy";
```

## Quick example

```ts
import { sortBy } from "@vgerbot/async";

const users = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
  { name: "Charlie", age: 35 },
];

const handle = sortBy(
  users,
  async (user, token) => {
    await token.sleep(10);
    return user.age;
  },
);

const result = await handle;
// [{ name: 'Bob', age: 25 }, { name: 'Alice', age: 30 }, { name: 'Charlie', age: 35 }]
```

## When to use `sortBy`

- **Async sort keys**: Sort by a value that requires an async computation.
- **Remote sorting**: Sort items by data fetched from an external service.
- **Computed ordering**: Sort by a derived property that requires calculation.
- **Controlled concurrency**: Limit concurrent key computations.

## API

```ts
// Array input
function sortBy<I, K extends string | number>(
  data: I[] | Promise<I[]>,
  iteratee: (item: I, token: CancellableToken) => Promise<K>,
  options?: SortByOptions<I>,
): CancellableHandle<I[]>;

// Object input
function sortBy<I, K extends string | number>(
  data: CollectionInput<I> | Promise<CollectionInput<I>>,
  iteratee: (item: I, key: number | string, token: CancellableToken) => Promise<K>,
  options?: SortByOptions<I>,
): CancellableHandle<I[]>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `I[]` or `Record<string, I>` | — | Input collection. Can be a Promise. |
| `iteratee` | `(item, token) => Promise<K>` or `(item, key, token) => Promise<K>` | — | Async function that computes the sort key. Must return `string` or `number`. |
| `options` | `SortByOptions<I>` | `undefined` | Configuration options. |

### `SortByOptions`

`SortByOptions` extends `CancellableOptions<I[]>` with:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `Infinity` | Maximum number of concurrent key computations. |

### Return value

Returns a `CancellableHandle<I[]>` that resolves to the sorted array (ascending order).

## Execution model

All sort keys are computed first (with optional concurrency limit), then items are sorted by their keys in ascending order. The sort is stable for equal keys.

## Error handling

If any iteratee rejects, `sortBy` rejects with the first error.

## Cancellation

All computations share a single `CancellableToken`. Calling `cancel()` signals cancellation.

## TypeScript tips

The sort key type `K` is constrained to `string | number`. The return type is always `I[]` (an array), even for object inputs.

```ts
const handle = sortBy(
  { a: 3, b: 1, c: 2 },
  async (value) => value,
);

const result = await handle; // [1, 2, 3]
```

## Related APIs

- [`groupBy`](/reference/collections/group-by/) groups items by a computed key.
- [`map`](/reference/collections/map/) transforms items.
- [`filter`](/reference/collections/filter/) filters items.
- [`partition`](/reference/collections/partition/) splits into two groups.
