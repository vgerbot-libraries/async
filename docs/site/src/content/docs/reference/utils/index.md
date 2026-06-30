---
title: Utils
description: Small async helpers for memoization, function composition, debouncing, throttling, deferred promises, and queues.
---

Utilities wrap individual functions or provide low-level async building blocks. Use them when you do not need a full control-flow primitive or executor.

## Import

```ts
import { memoize, compose, debounce } from "@vgerbot/async";
```

```ts
import { memoize } from "@vgerbot/async/utils";
```

## APIs

| API | Description |
| --- | --- |
| [`memoize`](/reference/utils/memoize/) | Caches results from an async function and returns cancellable handles. |
| `asyncify` | Converts a synchronous function into a cancellable async function. |
| `cache` | Caches a cancellable operation. |
| `compose` | Composes async functions right-to-left. |
| `seq` | Composes async functions left-to-right. |
| `constant` | Creates a cancellable handle resolving to a constant value. |
| `debounce` | Debounces an async function. |
| `throttle` | Throttles an async function. |
| `once` | Ensures an async task runs once and reuses the result. |
| `noop` | Empty function helper. |
| `Defer` | Deferred promise primitive with external resolve/reject. |
| `Queue` | Low-level async queue used internally by executors. |

## Quick example

```ts
import { memoize } from "@vgerbot/async";

const getUser = memoize(async (id: number, token) => {
  const response = await token.wrap(fetch(`/api/users/${id}`));
  return response.json();
});

const handle = getUser(1);
const user = await handle.promise;
```

## Related APIs

- [`memoize`](/reference/utils/memoize/)
- [Cancellable](/reference/cancellable/)
- [Choosing APIs](/guides/choosing-apis/)
