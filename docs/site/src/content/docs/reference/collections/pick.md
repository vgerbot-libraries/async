---
title: pick
description: Create an object with properties for which an async predicate returns truthy.
---

`pick` iterates over an object's properties and returns a new object containing only the properties for which the async predicate returns `true`.

> **Best for async property filtering**
> Use `pick` when you need to filter object properties based on an async condition, keeping the result as an object.

## Import

Root package:

```ts
import { pick } from "@vgerbot/async";
```

Module subpath:

```ts
import { pick } from "@vgerbot/async/collections";
```

Leaf subpath:

```ts
import { pick } from "@vgerbot/async/collections/pick";
```

## Quick example

```ts
import { pick } from "@vgerbot/async";

const data = { a: 1, b: 2, c: 3, d: 4 };

const handle = pick(
  data,
  async (value, key, token) => {
    await token.sleep(10);
    return value % 2 === 0;
  },
);

const result = await handle.promise; // { b: 2, d: 4 }
```

## When to use `pick`

- **Property filtering**: Keep only properties that pass an async condition.
- **Object subsetting**: Extract a subset of properties based on async validation.
- **Async key selection**: Select keys based on async computation on values.
- **Controlled concurrency**: Limit concurrent predicate evaluations.

## API

```ts
function pick<T>(
  obj: Record<string, T> | Promise<Record<string, T>>,
  predicate: (value: T, key: string, token: CancellableToken) => Promise<boolean>,
  options?: PickOptions<T>,
): CancellableHandle<Record<string, T>>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `obj` | `Record<string, T>` | — | Input object. Can be a Promise. |
| `predicate` | `(value, key, token) => Promise<boolean>` | — | Async predicate. Return `true` to keep the property. |
| `options` | `PickOptions<T>` | `undefined` | Configuration options. |

### `PickOptions`

`PickOptions` extends `CancellableOptions<Record<string, T>>` with:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `Infinity` | Maximum number of concurrent predicate evaluations. |

### Return value

Returns a `CancellableHandle<Record<string, T>>` that resolves to an object with only the picked properties.

## Execution model

All predicates are evaluated (with optional concurrency limit), then properties are collected into a new object.

## Error handling

If any predicate rejects, `pick` rejects with the first error.

## Cancellation

All evaluations share a single `CancellableToken`. Calling `cancel()` signals cancellation.

## TypeScript tips

The return type is `Record<string, T>` — the same value type as the input, with a subset of keys.

```ts
const handle = pick(
  { a: 1, b: 2, c: 3 },
  async (value, key) => key !== "a",
);

const result = await handle.promise; // { b: 2, c: 3 }
```

## Related APIs

- [`omit`](/reference/collections/omit/) is the inverse — excludes properties where predicate is true.
- [`filter`](/reference/collections/filter/) filters collections, returning an array.
- [`mapValues`](/reference/collections/map-values/) transforms object values.
- [`partition`](/reference/collections/partition/) splits a collection into two arrays.
