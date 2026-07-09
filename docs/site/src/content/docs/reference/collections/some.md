---
title: some
description: Check whether at least one item in a collection satisfies an async predicate.
---

`some` checks whether any item in a collection passes an async predicate. It short-circuits scheduling when the first `true` is found.

> **Best for existential checks**
> Use `some` when you need to verify that at least one item meets an async condition.

## Import

Root package:

```ts
import { some } from "@vgerbot/async";
```

Module subpath:

```ts
import { some } from "@vgerbot/async/collections";
```

Leaf subpath:

```ts
import { some } from "@vgerbot/async/collections/some";
```

## Quick example

```ts
import { some } from "@vgerbot/async";

const handle = some(
  [2, 4, 6, 7],
  async (item, token) => {
    await token.sleep(5);
    return item % 2 === 1;
  },
  { concurrency: 2 },
);

const hasOdd = await handle; // true
```

## When to use `some`

- **Existential validation**: Check if any item passes an async condition.
- **Availability checks**: Verify at least one resource is available.
- **Early termination**: Stop checking as soon as one match is found.
- **Permission checks**: Check if any user has a specific permission.

## API

```ts
// Array input
function some<I>(
  data: I[] | Promise<I[]>,
  predicate: (item: I, token: CancellableToken) => Promise<boolean>,
  options?: SomeOptions,
): CancellableHandle<boolean>;

// Object input
function some<I>(
  data: CollectionInput<I> | Promise<CollectionInput<I>>,
  predicate: (item: I, key: number | string, token: CancellableToken) => Promise<boolean>,
  options?: SomeOptions,
): CancellableHandle<boolean>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `I[]` or `Record<string, I>` | — | Input collection. Can be a Promise. |
| `predicate` | `(item, token) => Promise<boolean>` or `(item, key, token) => Promise<boolean>` | — | Async predicate. Return `true` if the item matches. |
| `options` | `SomeOptions` | `undefined` | Configuration options. |

### `SomeOptions`

`SomeOptions` extends `CancellableOptions<boolean>` with:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `Infinity` | Maximum number of concurrent predicate evaluations. |

### Return value

Returns a `CancellableHandle<boolean>` — `true` if any item passes, `false` otherwise. Returns `false` for empty collections.

## Execution model

- **Without concurrency limit**: Items are checked sequentially. Stops at the first `true`.
- **With concurrency limit**: Multiple workers evaluate predicates concurrently. When a `true` is found, new work scheduling stops. Already-running evaluations are allowed to complete.

## Error handling

If any predicate rejects, `some` rejects with the first error.

## Cancellation

All evaluations share a single `CancellableToken`. Calling `cancel()` signals cancellation.

## TypeScript tips

The return type is always `boolean`. Empty collections return `false`.

```ts
const hasInvalid = await some(items, async (item) => !item.isValid);
if (hasInvalid) {
  console.warn("Some items are invalid");
}
```

## Related APIs

- [`every`](/reference/collections/every/) checks if all items match.
- [`detect`](/reference/collections/detect/) finds the first matching item.
- [`filter`](/reference/collections/filter/) collects all matching items.
- [`any`](/reference/control-flow/any/) resolves with the first task to fulfill.
