---
title: each
description: Iterate over a collection asynchronously for side effects.
---

`each` iterates over an array or object, calling an async function for each item. Unlike `map`, it does not collect results—it is for side effects only.

> **Best for side-effect iteration**
> Use `each` when you need to perform an async operation on every item but don't need the return values.

## Import

Root package:

```ts
import { each } from "@vgerbot/async";
```

Module subpath:

```ts
import { each } from "@vgerbot/async/collections";
```

Leaf subpath:

```ts
import { each } from "@vgerbot/async/collections/each";
```

## Quick example

```ts
import { each } from "@vgerbot/async";

const handle = each(
  [1, 2, 3],
  async (item, token) => {
    await token.sleep(10);
    console.log(item);
  },
  { concurrency: 2 },
);

await handle;
```

Object input:

```ts
const handle = each(
  { a: 1, b: 2 },
  async (value, key, token) => {
    console.log(key, value);
  },
);

await handle;
```

## When to use `each`

- **Side-effect operations**: Log, save, or notify for each item without collecting results.
- **Batch processing**: Process items in batches with controlled concurrency.
- **Object iteration**: Iterate over object values with access to keys.
- **Fire-and-forget**: Perform operations where only completion matters, not return values.

## API

```ts
// Array input
function each<I>(
  data: I[] | Promise<I[]>,
  iterator: (item: I, token: CancellableToken) => Promise<void>,
  options?: EachOptions,
): CancellableHandle<void>;

// Object input
function each<I>(
  data: CollectionInput<I> | Promise<CollectionInput<I>>,
  iterator: (item: I, key: number | string, token: CancellableToken) => Promise<void>,
  options?: EachOptions,
): CancellableHandle<void>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `I[]` or `Record<string, I>` | — | Input collection (array or object). Can be a Promise that resolves to the collection. |
| `iterator` | `(item, token) => Promise<void>` or `(item, key, token) => Promise<void>` | — | Async function called for each item. For arrays, receives `(item, token)`. For objects, receives `(item, key, token)`. |
| `options` | `EachOptions` | `undefined` | Configuration options. |

### `EachOptions`

`EachOptions` extends `CancellableOptions<void>` with:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `Infinity` | Maximum number of concurrent operations. |

### Return value

Returns a `CancellableHandle<void>` that resolves when all iterations complete.

## Execution model

When `concurrency` is finite, `each` uses a slot-filling approach. Without a limit, all items are processed simultaneously.

## Error handling

If any iterator rejects, `each` rejects with the first error.

## Cancellation

All iterations share a single `CancellableToken`. Calling `cancel()` signals cancellation to all running iterations.

```ts
const handle = each(
  largeArray,
  async (item, token) => {
    await token.sleep(100);
    processItem(item);
  },
  { concurrency: 5, name: "batchEach" },
);

setTimeout(() => handle.cancel("User navigated away"), 500);
```

## TypeScript tips

The iterator returns `Promise<void>`. Use `map` instead if you need to collect results.

```ts
// Array: (item, token) => Promise<void>
each([1, 2, 3], async (n, token) => { await save(n); });

// Object: (item, key, token) => Promise<void>
each({ a: 1, b: 2 }, async (v, k, token) => { await save(k, v); });
```

## Related APIs

- [`map`](/reference/collections/map/) transforms items and collects results.
- [`filter`](/reference/collections/filter/) filters items based on a predicate.
- [`parallel`](/reference/control-flow/parallel/) runs an array of different tasks concurrently.
