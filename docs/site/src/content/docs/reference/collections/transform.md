---
title: transform
description: Transform a collection into an accumulator using an async iteratee with in-place mutation.
---

`transform` is similar to `reduce` but allows in-place mutation of the accumulator. It is useful for building objects or arrays incrementally. Unlike `reduce`, `transform` supports concurrency.

> **Best for incremental building**
> Use `transform` when you need to build up a result (object or array) by processing items, and want the flexibility of in-place mutation with optional concurrency.

## Import

Root package:

```ts
import { transform } from "@vgerbot/async";
```

Module subpath:

```ts
import { transform } from "@vgerbot/async/collections";
```

Leaf subpath:

```ts
import { transform } from "@vgerbot/async/collections/transform";
```

## Quick example

```ts
import { transform } from "@vgerbot/async";

const handle = transform(
  [1, 2, 3, 4],
  async (result, num, token) => {
    await token.sleep(10);
    if (num % 2 === 0) {
      result.push(num * 2);
    }
  },
  [] as number[],
);

const result = await handle.promise; // [4, 8]
```

Object input with default accumulator:

```ts
const handle = transform(
  { a: 1, b: 2, c: 3 },
  async (result, value, key) => {
    result[key] = value * 10;
  },
  {} as Record<string, number>,
);

const result = await handle.promise; // { a: 10, b: 20, c: 30 }
```

## When to use `transform`

- **Object building**: Construct an object from collection items.
- **Array filtering + mapping**: Combine filtering and mapping in one pass.
- **Incremental accumulation**: Build a result with in-place mutation.
- **Concurrent processing**: Unlike `reduce`, `transform` supports concurrency.

## API

```ts
// Array input
function transform<I, R>(
  data: I[] | Promise<I[]>,
  iteratee: (accumulator: R, item: I, token: CancellableToken) => Promise<void> | void,
  accumulator?: R,
  options?: TransformOptions<R>,
): CancellableHandle<R>;

// Object input
function transform<I, R>(
  data: CollectionInput<I> | Promise<CollectionInput<I>>,
  iteratee: (accumulator: R, item: I, key: number | string, token: CancellableToken) => Promise<void> | void,
  accumulator?: R,
  options?: TransformOptions<R>,
): CancellableHandle<R>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `I[]` or `Record<string, I>` | — | Input collection. Can be a Promise. |
| `iteratee` | `(acc, item, token) => Promise<void>` or `(acc, item, key, token) => Promise<void>` | — | Async function that mutates the accumulator for each item. |
| `accumulator` | `R` | `[]` or `{}` | Initial accumulator value. Defaults to `[]` for arrays, `{}` for objects. |
| `options` | `TransformOptions<R>` | `undefined` | Configuration options. |

### `TransformOptions`

`TransformOptions` extends `CancellableOptions<R>` with:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `Infinity` | Maximum number of concurrent iteratee calls. |

### Return value

Returns a `CancellableHandle<R>` that resolves to the final accumulator.

## Execution model

When `concurrency` is finite, `transform` uses a slot-filling approach. The accumulator is shared across all concurrent calls, so be careful with concurrent mutations. For safe concurrent use, ensure the iteratee operates on different parts of the accumulator.

> **Warning: concurrent mutation**
> When using `concurrency > 1`, the accumulator is shared. Ensure your iteratee is safe for concurrent access (e.g., pushing to an array is safe, but mutating the same property of an object is not).

## Error handling

If any iteratee rejects, `transform` rejects with the first error.

## Cancellation

All operations share a single `CancellableToken`. Calling `cancel()` signals cancellation.

## TypeScript tips

Always provide an explicit accumulator type for type safety:

```ts
const handle = transform(
  items,
  async (acc: Map<string, number>, item, token) => {
    acc.set(item.key, item.value);
  },
  new Map<string, number>(),
);

const result = await handle.promise; // Map<string, number>
```

## Related APIs

- [`reduce`](/reference/collections/reduce/) reduces sequentially without in-place mutation.
- [`map`](/reference/collections/map/) transforms items to a flat array.
- [`filter`](/reference/collections/filter/) filters items.
- [`groupBy`](/reference/collections/group-by/) groups items by key.
