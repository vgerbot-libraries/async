---
title: mapValues
description: Map each value of an object asynchronously while preserving original keys.
---

`mapValues` applies an async function to each value of an object and returns a new object with the same keys and mapped values.

> **Best for object value transformation**
> Use `mapValues` when you need to asynchronously transform the values of an object while keeping the keys intact.

## Import

Root package:

```ts
import { mapValues } from "@vgerbot/async";
```

Module subpath:

```ts
import { mapValues } from "@vgerbot/async/collections";
```

Leaf subpath:

```ts
import { mapValues } from "@vgerbot/async/collections/mapValues";
```

## Quick example

```ts
import { mapValues } from "@vgerbot/async";

const handle = mapValues(
  { a: 1, b: 2 },
  async (value, key, token) => {
    await token.sleep(10);
    return `${key}:${value * 2}`;
  },
  { concurrency: 2 },
);

const result = await handle.promise; // { a: "a:2", b: "b:4" }
```

## When to use `mapValues`

- **Object value transformation**: Transform each value of an object asynchronously.
- **Async enrichment**: Enrich object values with data from async sources.
- **Key-preserving mapping**: When you need the output to be an object, not an array.
- **Controlled concurrency**: Limit concurrent transformations.

## API

```ts
function mapValues<T extends Record<string, unknown>, R>(
  data: T | Promise<T>,
  callbackfn: (value: T[keyof T], key: keyof T, token: CancellableToken) => Promise<R>,
  options?: MapValuesOptions<R>,
): CancellableHandle<{ [K in keyof T]: R }>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `Record<string, unknown>` | — | Input object. Can be a Promise. |
| `callbackfn` | `(value, key, token) => Promise<R>` | — | Async function applied to each value. Receives the value, key, and `CancellableToken`. |
| `options` | `MapValuesOptions<R>` | `undefined` | Configuration options. |

### `MapValuesOptions`

`MapValuesOptions` extends `CancellableOptions<Record<string, R>>` with:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `Infinity` | Maximum number of concurrent transformations. |

### Return value

Returns a `CancellableHandle<{ [K in keyof T]: R }>` that resolves to a new object with the same keys and mapped values.

## Execution model

When `concurrency` is finite, `mapValues` uses a slot-filling approach. Without a limit, all values are processed simultaneously.

## Error handling

If any callback rejects, `mapValues` rejects with the first error.

## Cancellation

All transformations share a single `CancellableToken`. Calling `cancel()` signals cancellation.

## TypeScript tips

`mapValues` preserves the keys of the input object in the output type.

```ts
const handle = mapValues(
  { a: 1, b: 2, c: 3 },
  async (value, key, token) => value * 10,
);

const result = await handle.promise; // { a: 10, b: 20, c: 30 }
```

## Related APIs

- [`map`](/reference/collections/map/) maps collections to arrays.
- [`pick`](/reference/collections/pick/) filters object properties by predicate.
- [`omit`](/reference/collections/omit/) excludes object properties by predicate.
- [`transform`](/reference/collections/transform/) builds a custom accumulator.
