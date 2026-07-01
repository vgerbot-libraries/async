---
title: CancellableHandle
description: The handle returned to the caller of a cancellable task.
---

`CancellableHandle` is the object returned by `cancellable` and all APIs built on top of it. It represents the external interface to a cancellable operation — the caller uses it to await, cancel, and inspect the task.

> **External interface**
> `CancellableHandle` is what the caller holds. The task itself receives a `CancellableToken`.

## Import

Root package:

```ts
import { CancellableHandle } from "@vgerbot/async";
```

Module subpath:

```ts
import { CancellableHandle } from "@vgerbot/async/cancellable";
```

Leaf subpath:

```ts
import { CancellableHandle } from "@vgerbot/async/cancellable/CancellableHandle";
```

## Quick example

```ts
import { cancellable } from "@vgerbot/async";

const handle = cancellable(async (token) => {
  await token.sleep(5000);
  return "done";
});

// Await the result
const result = await handle.promise;

// Or cancel it
handle.cancel("No longer needed");

// Check state
console.log(handle.isCancelled());
```

## API

```ts
class CancellableHandle<T> implements PromiseLike<T> {
  readonly promise: Promise<T>;
  readonly signal: AbortSignal;

  cancel(reason?: unknown): void;
  isCancelled(): boolean;
  get cancelError(): CancelError | undefined;

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: (value: T) => TResult1 | PromiseLike<TResult1>,
    onrejected?: (reason: unknown) => TResult2 | PromiseLike<TResult2>,
  ): Promise<TResult1 | TResult2>;

  catch<TResult = never>(
    onrejected?: (reason: unknown) => TResult | PromiseLike<TResult>,
  ): Promise<T | TResult>;

  finally(onfinally?: () => void): Promise<T>;
}
```

### Properties

| Property | Type | Description |
| --- | --- | --- |
| `promise` | `Promise<T>` | The underlying promise. Await this to get the result. |
| `signal` | `AbortSignal` | The `AbortSignal` associated with this handle. Can be passed to other APIs. |
| `cancelError` | `CancelError \| undefined` | The `CancelError` if the handle was cancelled, otherwise `undefined`. |

### Methods

#### `cancel(reason?)`

Cancels the task. The `reason` is passed to the `CancelError` and can be any value.

```ts
handle.cancel("User navigated away");
handle.cancel(new Error("Timeout"));
handle.cancel(); // No reason
```

#### `isCancelled()`

Returns `true` if the handle has been cancelled.

```ts
if (handle.isCancelled()) {
  console.log("Task was cancelled");
}
```

### Promise-like interface

`CancellableHandle` implements `PromiseLike<T>`, so you can use `await` directly on the handle or call `.then()`, `.catch()`, and `.finally()`.

```ts
// Direct await
const result = await handle;

// .then()
handle.then((value) => console.log(value));

// .catch()
handle.catch((error) => console.error(error));

// .finally()
handle.finally(() => console.log("done"));
```

> **Prefer `.promise` for clarity**
> While `await handle` works, using `await handle.promise` is more explicit and recommended for documentation clarity.

## Cancellation

Calling `cancel()` triggers the following:

1. The `AbortSignal` is aborted with the given reason.
2. The `CancellableToken` inside the task receives the cancellation signal.
3. The task's `onCancel` callback (if provided in options) is called.
4. The promise rejects with a `CancelError` (unless already settled).

```ts
const handle = cancellable(
  async (token) => {
    await token.sleep(10_000);
    return "done";
  },
  {
    onCancel: () => console.log("Cleanup"),
  },
);

handle.cancel("User cancelled");

try {
  await handle.promise;
} catch (error) {
  if (error instanceof CancelError) {
    console.log(error.reason); // "User cancelled"
  }
}
```

## Linking signals

The `signal` property can be passed to other APIs that accept `AbortSignal`:

```ts
const handle = cancellable(async (token) => {
  const fetchHandle = cancellable(
    async (innerToken) => {
      return fetch("/api/data", { signal: innerToken.signal });
    },
    { signal: token.signal },
  );
  return fetchHandle.promise;
});

// Cancelling the outer handle cancels the inner one too
handle.cancel();
```

## TypeScript tips

`CancellableHandle` is generic over `T`. The `promise` property is `Promise<T>`.

```ts
const handle: CancellableHandle<string> = cancellable(async () => "hello");

const value: string = await handle.promise;
```

## Related APIs

- [`cancellable`](/reference/cancellable/cancellable/) — creates a `CancellableHandle`.
- [`CancellableToken`](/reference/cancellable/cancellable-token/) — the token passed to the task.
- [`CancelError`](/reference/cancellable/cancel-error/) — the error type on cancellation.
