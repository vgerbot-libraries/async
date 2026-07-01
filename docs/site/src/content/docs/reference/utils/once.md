---
title: once
description: Create a function that executes only once, caching the result.
---

`once` wraps an async function so that it only executes on the first call. Subsequent calls return the cached result. Concurrent calls during the first execution share the same in-flight promise.

> **Best for one-time initialization**
> Use `once` when a resource should be initialized only once, such as database connections, configuration loading, or singleton setup.

## Import

Root package:

```ts
import { once } from "@vgerbot/async";
```

Module subpath:

```ts
import { once } from "@vgerbot/async/utils";
```

Leaf subpath:

```ts
import { once } from "@vgerbot/async/utils/once";
```

## Quick example

```ts
import { once } from "@vgerbot/async";

let callCount = 0;

const initialize = once(async (token) => {
  callCount++;
  await token.sleep(100);
  return { connection: "established" };
});

const result1 = await initialize().promise; // callCount = 1
const result2 = await initialize().promise; // callCount = 1 (cached)
const result3 = await initialize().promise; // callCount = 1 (cached)

console.log(result1 === result2); // true (same object)
```

## When to use `once`

- **Singleton initialization**: Ensure a resource is created only once.
- **Lazy loading**: Defer initialization until first use, then cache.
- **Configuration loading**: Load configuration once and reuse.
- **Connection management**: Open a database connection once.

## API

```ts
function once<T>(
  fn: AsyncTask<T>,
  options?: CancellableOptions<T>,
): () => CancellableHandle<T>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `fn` | `AsyncTask<T>` | — | The async task to execute once. Receives a `CancellableToken`. |
| `options` | `CancellableOptions<T>` | `undefined` | Cancellable configuration options. |

### Return value

Returns a function that returns a `CancellableHandle<T>`. On the first call, the task is executed. On subsequent calls, a `CancellableHandle` resolving to the cached result is returned.

## Execution model

1. **First call**: The task is executed via `cancellable`. The in-flight `CancellableHandle` is stored.
2. **Concurrent calls**: While the first execution is in progress, concurrent calls return the same in-flight `CancellableHandle`.
3. **After completion**: The result is cached. All subsequent calls return a new `CancellableHandle` that resolves to the cached value.
4. **Error handling**: If the first execution fails, the error is not cached — subsequent calls will retry.

```ts
const connect = once(async (token) => {
  const conn = await openConnection();
  return conn;
});

// Multiple concurrent calls share the same in-flight promise
const [conn1, conn2, conn3] = await Promise.all([
  connect().promise,
  connect().promise,
  connect().promise,
]);

console.log(conn1 === conn2); // true
```

## Cancellation

The first execution's `CancellableHandle` can be cancelled. Subsequent calls return a new handle wrapping the cached result (or the in-flight promise if still running).

```ts
const init = once(async (token) => {
  await token.sleep(5000);
  return "initialized";
});

const handle = init();
handle.cancel("User cancelled");

// Retry — new execution since the first was cancelled
const result = await init().promise;
```

## TypeScript tips

`once` is generic over `T`. The returned function takes no arguments (the task receives only a `CancellableToken`).

```ts
const getConfig = once(async (token) => {
  const res = await token.wrap(fetch("/api/config"));
  return res.json() as Promise<{ apiUrl: string }>;
});

const config = await getConfig().promise; // { apiUrl: string }
```

## Related APIs

- [`memoize`](/reference/utils/memoize/) — caches results by argument.
- [`constant`](/reference/utils/constant/) — returns a fixed value.
- [`cancellable`](/reference/cancellable/cancellable/) — creates cancellable handles.
- [`asyncify`](/reference/utils/asyncify/) — wraps sync functions.
