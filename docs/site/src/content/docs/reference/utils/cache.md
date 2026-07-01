---
title: cache / cachify
description: Aliases for memoize — creates a cached version of an async function.
---

`cache` and `cachify` are aliases for [`memoize`](/reference/utils/memoize/). They create a cached version of an async function, storing results by argument key.

> **See [`memoize`](/reference/utils/memoize/) for full documentation.**

## Import

Root package:

```ts
import { cache, cachify } from "@vgerbot/async";
```

Module subpath:

```ts
import { cache, cachify } from "@vgerbot/async/utils";
```

Leaf subpath:

```ts
import { cache } from "@vgerbot/async/utils/cache";
```

## Quick example

```ts
import { cache } from "@vgerbot/async";

const fetchUser = cache(async (userId: string, token) => {
  const res = await token.wrap(fetch(`/api/users/${userId}`));
  return res.json();
});

// First call fetches
const user1 = await fetchUser("123").promise;

// Second call returns cached result
const user2 = await fetchUser("123").promise;

console.log(user1 === user2); // true
```

## Related APIs

- [`memoize`](/reference/utils/memoize/) — the primary API (full documentation).
- [`once`](/reference/utils/once/) — executes a function only once (no argument-based caching).
