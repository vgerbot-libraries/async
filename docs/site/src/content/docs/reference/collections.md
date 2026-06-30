---
title: Collections
description: Async collection helpers for arrays and objects.
---

Collection helpers apply async iterator functions to arrays or objects while preserving common collection operations such as mapping, filtering, reducing, grouping, and sorting.

## Import

```ts
import { map, filter, reduce } from "@vgerbot/async";
```

```ts
import { map } from "@vgerbot/async/collections";
```

## APIs

| API | Description |
| --- | --- |
| `each` | Runs an async iterator for each item. |
| `map` | Maps collection values to a new array or object. |
| `mapValues` | Maps object values while preserving keys. |
| `filter` | Keeps items whose async predicate resolves truthy. |
| `reject` | Removes items whose async predicate resolves truthy. |
| `detect` | Finds the first value matching an async predicate. |
| `find` | Finds a matching item. |
| `findIndex` | Finds the index of a matching array item. |
| `some` | Resolves true if any item matches. |
| `every` | Resolves true if every item matches. |
| `reduce` | Reduces values into an accumulator. |
| `groupBy` | Groups items by an async key selector. |
| `concat` | Maps values and flattens the mapped arrays. |
| `flatMap` | Maps and flattens values. |
| `partition` | Splits values into matching and non-matching groups. |
| `sortBy` | Sorts items by an async criterion. |
| `pick` | Picks object entries matching an async predicate. |
| `omit` | Omits object entries matching an async predicate. |
| `transform` | Builds custom object transformations. |

## Quick example

```ts
import { map, sortBy } from "@vgerbot/async";

const users = await map(ids, async (id) => fetchUser(id), { concurrency: 4 });
const sorted = await sortBy(users, async (user) => user.createdAt);
```

## Documentation status

This MVP page lists the public collection surface. Detailed reference pages for each helper will be added after the representative MVP pages are validated.

## Related APIs

- [Choosing APIs](/guides/choosing-apis/) compares collections with control-flow helpers.
- [`queue`](/reference/control-flow/queue/) is better for long-lived job streams.
