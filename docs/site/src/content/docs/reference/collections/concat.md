---
title: concat
description: Map over a collection and flatten the results into a single array.
---

`concat` (also exported as `flatMap`) maps an async function over a collection where each call returns an array, then flattens all results into a single array.

> **Best for flatMap operations**
> Use `concat` when each item produces multiple results that should be combined into one flat array.

## Import

Root package:

```ts
import { concat, flatMap } from "@vgerbot/async";
```

Module subpath:

```ts
import { concat, flatMap } from "@vgerbot/async/collections";
```

Leaf subpath:

```ts
import { concat } from "@vgerbot/async/collections/concat";
```

## Quick example

```ts
import { concat } from "@vgerbot/async";

const handle = concat(
  [1, 2, 3],
  async (num, token) => {
    await token.sleep(10);
    return [num, num * 2];
  },
  { concurrency: 2 },
);

const result = await handle.promise; // [1, 2, 2, 4, 3, 6]
```

Object input:

```ts
const handle = concat(
  { a: "hello", b: "world" },
  async (value, key) => value.split(""),
);

const result = await handle.promise; // ['h', 'e', 'l', 'l', 'o', 'w', 'o', 'r', 'l', 'd']
```

## When to use `concat`

- **flatMap operations**: When each item maps to multiple results.
- **Expanding records**: Expand each item into sub-items.
- **Multi-fetch**: Fetch related items for each parent and flatten.
- **Controlled concurrency**: Limit concurrent mapping operations.

## API

```ts
// Array input
function concat<I, R>(
  data: I[] | Promise<I[]>,
  iteratee: (item: I, token: CancellableToken) => Promise<R[]>,
  options?: ConcatOptions<R>,
): CancellableHandle<R[]>;

// Object input
function concat<I, R>(
  data: CollectionInput<I> | Promise<CollectionInput<I>>,
  iteratee: (item: I, key: number | string, token: CancellableToken) => Promise<R[]>,
  options?: ConcatOptions<R>,
): CancellableHandle<R[]>;
```

`flatMap` is an alias for `concat`.

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `I[]` or `Record<string, I>` | — | Input collection. Can be a Promise. |
| `iteratee` | `(item, token) => Promise<R[]>` or `(item, key, token) => Promise<R[]>` | — | Async function that returns an array for each item. |
| `options` | `ConcatOptions<R>` | `undefined` | Configuration options. |

### `ConcatOptions`

`ConcatOptions` extends `CancellableOptions<R[]>` with:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `Infinity` | Maximum number of concurrent operations. |

### Return value

Returns a `CancellableHandle<R[]>` that resolves to a flattened array of all results.

## Execution model

All iteratee calls are executed (with optional concurrency limit), then the resulting arrays are flattened using `Array.prototype.flat()`.

## Error handling

If any iteratee rejects, `concat` rejects with the first error.

## Cancellation

All operations share a single `CancellableToken`. Calling `cancel()` signals cancellation.

## TypeScript tips

The iteratee must return `Promise<R[]>` — an array of the mapped type.

```ts
const handle = concat(
  users,
  async (user, token) => {
    const posts = await fetchPosts(user.id);
    return posts; // Post[]
  },
);

const allPosts = await handle.promise; // Post[]
```

## Related APIs

- [`map`](/reference/collections/map/) maps items to single values (no flattening).
- [`filter`](/reference/collections/filter/) filters items.
- [`transform`](/reference/collections/transform/) builds a custom accumulator.
- [`parallel`](/reference/control-flow/parallel/) runs an array of different tasks.
