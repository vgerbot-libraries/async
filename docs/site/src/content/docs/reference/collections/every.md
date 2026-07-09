---
title: every
description: Check whether all items in a collection satisfy an async predicate.
---

`every` checks whether every item in a collection passes an async predicate. It short-circuits scheduling when the first `false` is found.

> **Best for universal validation**
> Use `every` when you need to verify that all items meet an async condition.

## Import

Root package:

```ts
import { every } from "@vgerbot/async";
```

Module subpath:

```ts
import { every } from "@vgerbot/async/collections";
```

Leaf subpath:

```ts
import { every } from "@vgerbot/async/collections/every";
```

## Quick example

```ts
import { every } from "@vgerbot/async";

const handle = every(
  [2, 4, 6],
  async (item, token) => {
    await token.sleep(5);
    return item % 2 === 0;
  },
  { concurrency: 2 },
);

const allEven = await handle; // true
```

## When to use `every`

- **Validation**: Verify all items pass an async check (e.g., all URLs are reachable).
- **Precondition checks**: Ensure all conditions are met before proceeding.
- **Quality checks**: Validate all items in a batch.
- **Short-circuit optimization**: Stop checking as soon as one item fails.

## API

```ts
// Array input
function every<I>(
  data: I[] | Promise<I[]>,
  predicate: (item: I, token: CancellableToken) => Promise<boolean>,
  options?: EveryOptions,
): CancellableHandle<boolean>;

// Object input
function every<I>(
  data: CollectionInput<I> | Promise<CollectionInput<I>>,
  predicate: (item: I, key: number | string, token: CancellableToken) => Promise<boolean>,
  options?: EveryOptions,
): CancellableHandle<boolean>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `I[]` or `Record<string, I>` | — | Input collection. Can be a Promise. |
| `predicate` | `(item, token) => Promise<boolean>` or `(item, key, token) => Promise<boolean>` | — | Async predicate. Return `true` if the item passes. |
| `options` | `EveryOptions` | `undefined` | Configuration options. |

### `EveryOptions`

`EveryOptions` extends `CancellableOptions<boolean>` with:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `Infinity` | Maximum number of concurrent predicate evaluations. |

### Return value

Returns a `CancellableHandle<boolean>` — `true` if all items pass, `false` otherwise. Returns `true` for empty collections.

## Execution model

- **Without concurrency limit**: Items are checked sequentially. Stops at the first `false`.
- **With concurrency limit**: Multiple workers evaluate predicates concurrently. When a `false` is found, new work scheduling stops. Already-running evaluations are allowed to complete.

## Error handling

If any predicate rejects, `every` rejects with the first error.

## Cancellation

All evaluations share a single `CancellableToken`. Calling `cancel()` signals cancellation.

## TypeScript tips

The return type is always `boolean`. Empty collections return `true`.

```ts
const allValid = await every(items, async (item) => item.isValid);
if (allValid) {
  // proceed
}
```

## Related APIs

- [`some`](/reference/collections/some/) checks if any item matches.
- [`detect`](/reference/collections/detect/) finds the first matching item.
- [`filter`](/reference/collections/filter/) collects all matching items.
- [`allSettled`](/reference/control-flow/all-settled/) collects all outcomes from tasks.
