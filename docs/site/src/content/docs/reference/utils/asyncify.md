---
title: asyncify
description: Wrap a synchronous function to return a cancellable promise.
---

`asyncify` converts a synchronous function into an async function that returns a `CancellableHandle`. Useful for integrating sync code into async pipelines.

> **Best for sync-to-async bridging**
> Use `asyncify` when you need to use a synchronous function in a context that expects a cancellable async function.

## Import

Root package:

```ts
import { asyncify } from "@vgerbot/async";
```

Module subpath:

```ts
import { asyncify } from "@vgerbot/async/utils";
```

Leaf subpath:

```ts
import { asyncify } from "@vgerbot/async/utils/asyncify";
```

## Quick example

```ts
import { asyncify } from "@vgerbot/async";

const syncFn = (x: number, y: number) => x + y;
const asyncFn = asyncify(syncFn);

const handle = asyncFn(3, 4);
const result = await handle.promise; // 7
```

## When to use `asyncify`

- **Sync-to-async bridging**: Convert a sync function for use in async pipelines.
- **Library integration**: Wrap sync library functions for use with `@vgerbot/async` APIs.
- **Testing**: Mock async functions from sync implementations.
- **Uniform interfaces**: Make all functions in a pipeline return `CancellableHandle`.

## API

```ts
function asyncify<T, Args extends unknown[] = unknown[]>(
  fn: (...args: Args) => T,
  options?: CancellableOptions<T>,
): (...args: Args) => CancellableHandle<T>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `fn` | `(...args: Args) => T` | — | Synchronous function to wrap. |
| `options` | `CancellableOptions<T>` | `undefined` | Cancellable configuration options. |

### Return value

Returns a function that takes the same arguments as `fn` and returns a `CancellableHandle<T>`.

## Execution model

The returned function wraps `fn` in a `cancellable` call. The sync function is executed inside an async wrapper, so any thrown errors become promise rejections.

```ts
const parseJson = asyncify(JSON.parse);

try {
  await parseJson("{ invalid json }").promise;
} catch (error) {
  console.log("Parse error:", error); // SyntaxError
}
```

## Cancellation

Since the wrapped function is synchronous, cancellation only matters if the handle is cancelled before the microtask runs. The `CancellableOptions` are passed through to the underlying `cancellable` call.

```ts
const asyncRead = asyncify(readFileSync, {
  name: "fileRead",
});

const handle = asyncRead("data.txt");
handle.cancel("No longer needed");
```

## TypeScript tips

`asyncify` preserves the argument types of the original function. The return type becomes `CancellableHandle<T>`.

```ts
const fn = (x: number, y: string): boolean => x > y.length;
const asyncFn = asyncify(fn);

const handle = asyncFn(5, "hello"); // CancellableHandle<boolean>
const result = await handle.promise; // boolean
```

## Related APIs

- [`cancellable`](/reference/cancellable/cancellable/) — the primitive used by `asyncify`.
- [`constant`](/reference/utils/constant/) — returns a constant value as a `CancellableHandle`.
- [`compose`](/reference/utils/compose/) — composes async functions.
- [`once`](/reference/utils/once/) — executes a function only once.
