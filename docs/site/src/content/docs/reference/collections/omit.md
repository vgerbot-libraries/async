---
title: omit
description: Create an object excluding properties for which an async predicate returns truthy.
---

`omit` is the inverse of `pick`. It iterates over an object's properties and returns a new object containing only the properties for which the async predicate returns `false`.

> **Best for async property exclusion**
> Use `omit` when you need to exclude object properties based on an async condition, keeping the result as an object.

## Import

Root package:

```ts
import { omit } from "@vgerbot/async";
```

Module subpath:

```ts
import { omit } from "@vgerbot/async/collections";
```

Leaf subpath:

```ts
import { omit } from "@vgerbot/async/collections/omit";
```

## Quick example

```ts
import { omit } from "@vgerbot/async";

const data = { a: 1, b: 2, c: 3, d: 4 };

const handle = omit(
  data,
  async (value, key, token) => {
    await token.sleep(10);
    return value % 2 === 0;
  },
);

const result = await handle.promise; // { a: 1, c: 3 }
```

## When to use `omit`

- **Property exclusion**: Remove properties that match an async condition.
- **Sensitive data stripping**: Exclude properties based on async permission checks.
- **Object cleanup**: Remove unwanted properties determined by async logic.
- **Controlled concurrency**: Limit concurrent predicate evaluations.

## API

```ts
function omit<T>(
  obj: Record<string, T> | Promise<Record<string, T>>,
  predicate: (value: T, key: string, token: CancellableToken) => Promise<boolean>,
  options?: OmitOptions<T>,
): CancellableHandle<Record<string, T>>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `obj` | `Record<string, T>` | — | Input object. Can be a Promise. |
| `predicate` | `(value, key, token) => Promise<boolean>` | — | Async predicate. Return `true` to exclude the property. |
| `options` | `OmitOptions<T>` | `undefined` | Configuration options. |

### `OmitOptions`

`OmitOptions` extends `CancellableOptions<Record<string, T>>` with:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `Infinity` | Maximum number of concurrent predicate evaluations. |

### Return value

Returns a `CancellableHandle<Record<string, T>>` that resolves to an object with the remaining properties.

## Execution model

All predicates are evaluated (with optional concurrency limit), then properties where the predicate returned `false` are collected into a new object.

## Error handling

If any predicate rejects, `omit` rejects with the first error.

## Cancellation

All evaluations share a single `CancellableToken`. Calling `cancel()` signals cancellation.

## TypeScript tips

The return type is `Record<string, T>` — the same value type as the input, with a subset of keys.

```ts
const handle = omit(
  { a: 1, b: 2, c: 3 },
  async (value, key) => key === "b",
);

const result = await handle.promise; // { a: 1, c: 3 }
```

## Related APIs

- [`pick`](/reference/collections/pick/) is the inverse — keeps properties where predicate is true.
- [`filter`](/reference/collections/filter/) filters collections, returning an array.
- [`reject`](/reference/collections/reject/) is the inverse of `filter`.
- [`mapValues`](/reference/collections/map-values/) transforms object values.
