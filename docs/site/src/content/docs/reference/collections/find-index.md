---
title: findIndex
description: Find the index of the first item that satisfies an async predicate.
---

`findIndex` evaluates an async predicate for each item and returns the index of the first match. Returns `-1` if no item matches.

> **Best for position search**
> Use `findIndex` when you need the position (index) of the first item matching an async condition.

## Import

Root package:

```ts
import { findIndex } from "@vgerbot/async";
```

Module subpath:

```ts
import { findIndex } from "@vgerbot/async/collections";
```

Leaf subpath:

```ts
import { findIndex } from "@vgerbot/async/collections/findIndex";
```

## Quick example

```ts
import { findIndex } from "@vgerbot/async";

const handle = findIndex(
  [1, 2, 3, 4],
  async (item, token) => {
    await token.sleep(10);
    return item > 2;
  },
);

const index = await handle.promise; // 2
```

## When to use `findIndex`

- **Position lookup**: Find the index of the first matching item.
- **Slot finding**: Find the first available slot in a collection.
- **Validation position**: Find where the first invalid item is located.
- **Short-circuit search**: Stop as soon as a match is found with concurrency support.

## API

```ts
// Array input
function findIndex<I>(
  data: I[] | Promise<I[]>,
  predicate: (item: I, token: CancellableToken) => Promise<boolean>,
  options?: FindIndexOptions,
): CancellableHandle<number>;

// Object input
function findIndex<I>(
  data: CollectionInput<I> | Promise<CollectionInput<I>>,
  predicate: (item: I, key: number | string, token: CancellableToken) => Promise<boolean>,
  options?: FindIndexOptions,
): CancellableHandle<number>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `I[]` or `Record<string, I>` | — | Input collection. Can be a Promise. |
| `predicate` | `(item, token) => Promise<boolean>` or `(item, key, token) => Promise<boolean>` | — | Async predicate. Return `true` to match. |
| `options` | `FindIndexOptions` | `undefined` | Configuration options. |

### `FindIndexOptions`

`FindIndexOptions` extends `CancellableOptions<number>` with:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `Infinity` | Maximum number of concurrent predicate evaluations. |

### Return value

Returns a `CancellableHandle<number>` — the index of the first matching item, or `-1` if no match is found.

## Execution model

- **Without concurrency limit**: Items are checked sequentially. Stops at the first match.
- **With concurrency limit**: Multiple workers evaluate predicates concurrently. When a match is found, new work scheduling stops. Already-running evaluations are allowed to complete.

## Error handling

If any predicate rejects, `findIndex` rejects with the first error.

## Cancellation

All evaluations share a single `CancellableToken`. Calling `cancel()` signals cancellation.

## TypeScript tips

The return type is always `number`. Check for `-1` before using the index.

```ts
const index = await findIndex(
  items,
  async (item) => item.isValid,
).promise;

if (index !== -1) {
  console.log("Found at index:", index);
}
```

## Related APIs

- [`detect`](/reference/collections/detect/) returns the matching item itself (not the index).
- [`some`](/reference/collections/some/) checks if any item matches.
- [`filter`](/reference/collections/filter/) collects all matching items.
- [`every`](/reference/collections/every/) checks if all items match.
