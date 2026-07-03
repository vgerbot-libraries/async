---
title: CancellableToken
description: The token passed to a cancellable task for cooperative cancellation.
---

`CancellableToken` is passed to the async function inside `cancellable`. It provides utilities for cooperative cancellation: wrapping promises, sleeping, running intervals, animation frames, checking cancellation status, and registering cleanup callbacks.

> **Internal interface**
> `CancellableToken` is what the task receives. The caller holds a `CancellableHandle`.

## Import

Root package:

```ts
import { CancellableToken } from "@vgerbot/async";
```

Module subpath:

```ts
import { CancellableToken } from "@vgerbot/async/cancellable";
```

Leaf subpath:

```ts
import { CancellableToken } from "@vgerbot/async/cancellable/CancellableToken";
```

## Quick example

```ts
import { cancellable } from "@vgerbot/async";

const handle = cancellable(async (token) => {
  // Cancellable sleep — rejects with CancelError if cancelled
  await token.sleep(5000);

  // Wrap a promise so it rejects on cancellation
  const response = await token.wrap(fetch("/api/data"));

  // Explicit cancellation check
  token.throwIfCancelled();

  return response.json();
});

handle.cancel("User navigated away");
```

## API

```ts
class CancellableToken {
  readonly signal: AbortSignal;
  readonly name: string | undefined;

  // Retry state
  get retryAttempt: number;

  // Cancellation state
  isCancelled(): boolean;
  throwIfCancelled(): void;
  onCancel(callback: (error: CancelError) => void): () => void;

  // Promise wrapping
  wrap<T>(p: CancellableHandle<T> | Promise<T>): Promise<T>;
  defer<T>(): Defer<T>;

  // Time utilities
  sleep(ms: number): CancellableHandle<void>;
  frame(): CancellableHandle<void>;
  delay(schedule: (done: () => void) => () => void): CancellableHandle<void>;
  interval(fn: () => void | Promise<void>, interval: number): CancellableHandle<void>;
}
```

### Properties

| Property | Type | Description |
| --- | --- | --- |
| `signal` | `AbortSignal` | The underlying `AbortSignal` that drives the token's cancellation. When the parent `CancellableHandle` is cancelled (or a linked `signal`/`token` aborts), this signal aborts. Pass it directly to native APIs that accept `AbortSignal`, e.g. `fetch(url, { signal: token.signal })`. |
| `name` | `string \| undefined` | The name assigned to the task (from `CancellableOptions.name`). Used in cancellation messages and error labels. |
| `retryAttempt` | `number` | The current retry attempt number (0-indexed). `0` for the initial attempt, `1` for the first retry, and so on. Useful for tracking retry progress when `retry` options are configured. |

### Methods

#### `isCancelled()`

Returns `true` if the token has been cancelled (i.e. the underlying `AbortSignal` has been aborted).

```ts
async (token) => {
  if (token.isCancelled()) {
    return fallbackValue;
  }
  // continue work
}
```

#### `throwIfCancelled()`

Throws a `CancelError` if the token has been cancelled. Use this to check for cancellation at strategic points in long-running tasks.

```ts
async (token) => {
  for (const item of largeArray) {
    token.throwIfCancelled();
    await processItem(item);
  }
}
```

#### `onCancel(callback)`

Registers a callback invoked when the token is cancelled. If the token is already cancelled, the callback is invoked immediately. Returns a cleanup function to remove the listener.

The callback receives the resolved `CancelError`.

```ts
async (token) => {
  const connection = await openConnection();
  const unsubscribe = token.onCancel((error) => {
    console.log("Task cancelled:", error.message);
    connection.close();
  });

  // Later, to remove the listener:
  // unsubscribe();

  return doWork(connection);
}
```

#### `wrap(p)`

Wraps a `Promise` or `CancellableHandle` so that it rejects with a `CancelError` if the token is cancelled.

When wrapping a `CancellableHandle`, cancellation is forwarded to the nested handle — calling `cancel()` on the parent will also cancel the wrapped handle.

```ts
async (token) => {
  // Wrap a plain promise
  const response = await token.wrap(fetch("/api/data"));
  return response.json();
}
```

```ts
async (token) => {
  // Wrap a nested CancellableHandle — cancellation cascades
  const handle = cancellable(async (innerToken) => {
    await innerToken.sleep(1000);
    return "done";
  });

  const result = await token.wrap(handle);
  return result;
}
```

> **`wrap` vs `signal`**
> Use `token.wrap(promise)` for promises that don't natively support `AbortSignal`. Use `token.signal` directly with APIs that accept it (e.g., `fetch(url, { signal: token.signal })`).

#### `defer<T>()`

Creates a `Defer<T>` that is automatically rejected with a `CancelError` when the token is cancelled. Use this instead of `new Promise()` when you need external control over resolve/reject with cancellation support.

If the token is already cancelled, the returned `Defer` is immediately rejected.

```ts
async (token) => {
  // Wait for a DOM event with cancellation
  const clickEvent = token.defer<MouseEvent>();
  button.addEventListener("click", clickEvent.resolve, {
    once: true,
    signal: token.signal,
  });

  // Resolves on click, rejects with CancelError if cancelled
  return (await clickEvent).target;
}
```

> **`defer` vs `wrap`**
> Use `token.defer()` when you need a deferred you control (e.g., bridging event callbacks). Use `token.wrap(promise)` when you already have a promise to race against cancellation.

#### `sleep(ms)`

Creates a cancellable sleep/delay that resolves after `ms` milliseconds. Returns a `CancellableHandle<void>` — if the token is cancelled during the sleep, the handle rejects with a `CancelError`. The handle can also be cancelled independently of the parent token.

```ts
async (token) => {
  await token.sleep(1000);
  console.log("1 second elapsed");
}
```

#### `frame()`

Creates a cancellable animation frame. Uses `requestAnimationFrame` if available, otherwise falls back to `setTimeout` (~16ms). Returns a `CancellableHandle<void>` that resolves on the next animation frame, or rejects with a `CancelError` if cancelled before the frame callback.

```ts
async (token) => {
  await token.frame();
  // Next animation frame reached
}
```

#### `delay(schedule)`

Creates a cancellable delay using a custom scheduling function. The scheduling function receives a callback to invoke when the delay completes, and must return a cleanup function to cancel the scheduled operation.

The delay stops when:

- The parent token is cancelled
- The returned handle is cancelled

```ts
async (token) => {
  // Custom delay using setTimeout
  await token.delay((done) => {
    const timer = setTimeout(done, 1000);
    return () => clearTimeout(timer);
  });
}
```

```ts
async (token) => {
  // Cancel independently
  const handle = token.delay((done) => {
    const timer = setTimeout(done, 5000);
    return () => clearTimeout(timer);
  });
  handle.cancel();
}
```

#### `interval(fn, interval)`

Executes `fn` repeatedly, waiting `interval` ms between each execution (after the previous one completes). The function can be synchronous or asynchronous. Returns a `CancellableHandle<void>` that can be used to cancel the interval independently of the parent token.

The interval stops when:

- The parent token is cancelled
- The returned handle is cancelled
- `fn` throws an error (non-`CancelError` errors reject with the original error)

When the interval stops due to cancellation (parent token or handle), the handle **resolves** with `undefined` — it does not reject. This allows `await handle` to complete silently. You can still check `handle.isCancelled()` to determine if it was cancelled.

When `fn` throws a non-`CancelError` error, the handle **rejects** with that original error.

```ts
async (token) => {
  // Poll an API every 5 seconds
  const handle = token.interval(async () => {
    const data = await fetchData();
    processData(data);
  }, 5000);

  // Cancel the interval independently
  handle.cancel();
}
```

## Cancellation patterns

### Polling with cancellation

```ts
const handle = cancellable(async (token) => {
  while (true) {
    token.throwIfCancelled();
    const status = await token.wrap(fetch("/api/status"));
    if (status.ok) return status.json();
    await token.sleep(1000);
  }
});
```

### Wrapping native fetch

```ts
const handle = cancellable(async (token) => {
  // Option 1: Use signal directly (preferred for fetch)
  const res = await fetch("/api/data", { signal: token.signal });

  // Option 2: Use wrap (for APIs that don't support AbortSignal)
  const res2 = await token.wrap(fetch("/api/data"));

  return res.json();
});
```

### Cleanup on cancellation

```ts
const handle = cancellable(async (token) => {
  const stream = await openStream();
  token.onCancel(() => stream.close());

  const data = await token.wrap(stream.read());
  return data;
});
```

### Nested cancellable tasks

```ts
const handle = cancellable(async (token) => {
  // Cancellation cascades to the nested task
  const result = await token.wrap(
    cancellable(async (innerToken) => {
      await innerToken.sleep(1000);
      return "inner done";
    })
  );
  return result;
});
```

## TypeScript tips

`CancellableToken` is not generic — it doesn't carry a type parameter. The token is purely for cancellation control.

```ts
const task: AsyncTask<MyResult> = async (token: CancellableToken) => {
  // token has no type parameter
  return myResult;
};
```

## Related APIs

- [`cancellable`](/reference/cancellable/cancellable/) — creates a task with a `CancellableToken`.
- [`CancellableHandle`](/reference/cancellable/cancellable-handle/) — the handle returned to the caller.
- [`CancelError`](/reference/cancellable/cancel-error/) — the error type thrown on cancellation.
- [`delay`](/reference/control-flow/delay/) — a standalone cancellable delay.
