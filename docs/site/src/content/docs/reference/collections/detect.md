---
title: detect
description: Find the first item in a collection that satisfies an async predicate.
---

`detect` (also exported as `find`) returns the first item whose async predicate resolves to `true`. With concurrency > 1, it short-circuits scheduling new work after a match is found.

> **Best for async search**
> Use `detect` when you need to find the first item in a collection that matches an async condition.

## Import

Root package:

```ts
import { detect, find } from "@vgerbot/async";
```

Module subpath:

```ts
import { detect, find } from "@vgerbot/async/collections";
```

Leaf subpath:

```ts
import { detect } from "@vgerbot/async/collections/detect";
```

## Quick example

```ts
import { detect } from "@vgerbot/async";

const handle = detect(
  [1, 2, 3, 4],
  async (item, token) => {
    await token.sleep(10);
    return item > 2;
  },
  { concurrency: 2 },
);

const found = await handle.promise; // 3
```

Object input:

```ts
const handle = detect(
  { a: 1, b: 4, c: 2 },
  async (value, key) => key === "b" && value > 3,
);

const found = await handle.promise; // 4
```

## When to use `detect`

- **Async search**: Find the first item matching an async condition.
- **Resource lookup**: Find the first available resource by checking each asynchronously.
- **Validation**: Find the first invalid item in a collection.
- **Short-circuit search**: Stop as soon as a match is found with concurrency support.

## API

```ts
// Array input
function detect<I>(
  data: I[] | Promise<I[]>,
  predicate: (item: I, token: CancellableToken) => Promise<boolean>,
  options?: DetectOptions<I>,
): CancellableHandle<I | undefined>;

// Object input
function detect<I>(
  data: CollectionInput<I> | Promise<CollectionInput<I>>,
  predicate: (item: I, key: number | string, token: CancellableToken) => Promise<boolean>,
  options?: DetectOptions<I>,
): CancellableHandle<I | undefined>;
```

`find` is an alias for `detect`.

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `I[]` or `Record<string, I>` | — | Input collection. Can be a Promise. |
| `predicate` | `(item, token) => Promise<boolean>` or `(item, key, token) => Promise<boolean>` | — | Async predicate. Return `true` to match. |
| `options` | `DetectOptions<I>` | `undefined` | Configuration options. |

### `DetectOptions`

`DetectOptions` extends `CancellableOptions<I | undefined>` with:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `Infinity` | Maximum number of concurrent predicate evaluations. |

### Return value

Returns a `CancellableHandle<I | undefined>` that resolves to the matched item, or `undefined` if no item matches.

## Execution model

- **Without concurrency limit**: Items are checked sequentially. Stops at the first match.
- **With concurrency limit**: Multiple workers evaluate predicates concurrently. When a match is found, new work scheduling stops. Already-running evaluations are allowed to complete.

## Error handling

If any predicate rejects, `detect` rejects with the first error.

## Cancellation

All evaluations share a single `CancellableToken`. Calling `cancel()` signals cancellation.

## TypeScript tips

The return type is `I | undefined` — always check for `undefined` before using the result.

```ts
const found = await detect(items, async (item) => item.isValid).promise;
if (found !== undefined) {
  console.log("Found:", found);
}
```

## Related APIs

- [`findIndex`](/reference/collections/find-index/) finds the index of the first matching item.
- [`filter`](/reference/collections/filter/) collects all matching items.
- [`some`](/reference/collections/some/) checks if any item matches.
- [`every`](/reference/collections/every/) checks if all items match.
