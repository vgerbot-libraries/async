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
| [`cache / cachify`](/reference/utils/cache/) | Aliases for `memoize`. |
| [`asyncify`](/reference/utils/asyncify/) | Converts a synchronous function into a cancellable async function. |
| [`compose / seq`](/reference/utils/compose/) | Composes async functions right-to-left (`compose`) or left-to-right (`seq`). |
| [`constant`](/reference/utils/constant/) | Creates a cancellable handle resolving to a constant value. |
| [`debounce`](/reference/utils/debounce/) | Debounces an async function. |
| [`throttle`](/reference/utils/throttle/) | Throttles an async function. |
| [`once`](/reference/utils/once/) | Ensures an async task runs once and reuses the result. |
| [`noop`](/reference/utils/noop/) | Empty function helper. |
| [`Defer`](/reference/utils/defer/) | Deferred promise primitive with external resolve/reject. |

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
- [`compose`](/reference/utils/compose/)
- [`Defer`](/reference/utils/defer/)
- [Cancellable](/reference/cancellable/)
- [Choosing APIs](/guides/choosing-apis/)
