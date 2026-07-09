---
title: Collections
description: Iterate, transform, and filter arrays and objects asynchronously with concurrency control and cancellation.
---

Collection helpers apply an async function to each element of an array or object. They support optional concurrency limits and cancellation.

## Import

```ts
import { map, filter, reduce, each } from "@vgerbot/async";
```

```ts
import { map, filter, reduce } from "@vgerbot/async/collections";
```

## Array vs object input

All collection APIs accept both arrays and objects. For arrays, the callback receives `(item, token)`. For objects, the callback receives `(item, key, token)`.

```ts
// Array
map([1, 2, 3], async (n, token) => n * 2);

// Object
map({ a: 1, b: 2 }, async (v, k, token) => v * 2);
```

## Concurrency

Most collection APIs accept a `concurrency` option to limit simultaneous operations:

```ts
map(items, async (item, token) => fetch(item.url), { concurrency: 5 });
```

## APIs

| API | Description |
| --- | --- |
| [`map`](/reference/collections/map/) | Transform each item, returning an array of results. |
| [`each`](/reference/collections/each/) | Iterate for side effects, no results collected. |
| [`filter`](/reference/collections/filter/) | Keep items that pass an async predicate. |
| [`reduce`](/reference/collections/reduce/) | Sequentially accumulate a result. |
| [`detect`](/reference/collections/detect/) | Find the first item matching a predicate. |
| [`every`](/reference/collections/every/) | Check if all items pass a predicate. |
| [`some`](/reference/collections/some/) | Check if any item passes a predicate. |
| [`groupBy`](/reference/collections/group-by/) | Group items by an async-computed key. |
| [`sortBy`](/reference/collections/sort-by/) | Sort items by an async-computed key. |
| [`concat`](/reference/collections/concat/) | Map and flatten results (flatMap). |
| [`partition`](/reference/collections/partition/) | Split into two arrays by predicate. |
| [`mapValues`](/reference/collections/map-values/) | Transform object values, preserving keys. |
| [`pick`](/reference/collections/pick/) | Filter object properties by predicate. |
| [`omit`](/reference/collections/omit/) | Exclude object properties by predicate. |
| [`transform`](/reference/collections/transform/) | Build a result with in-place mutation. |
| [`reject`](/reference/collections/reject/) | Remove items matching a predicate. |
| [`findIndex`](/reference/collections/find-index/) | Find the index of the first matching item. |

## Related APIs

- [Control Flow](/reference/control-flow/)
- [Cancellable](/reference/cancellable/)
- [Concurrency Patterns](/guides/concurrency-patterns/)
