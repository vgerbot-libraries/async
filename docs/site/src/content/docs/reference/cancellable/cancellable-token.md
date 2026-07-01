---
title: CancellableToken
description: The token passed to a cancellable task for cooperative cancellation.
---

`CancellableToken` is passed to the async function inside `cancellable`. It provides utilities for cooperative cancellation: wrapping promises, sleeping, checking cancellation, and registering cleanup callbacks.

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
  // Sleep that can be cancelled
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

  // Cancellation state
  get isCancelled(): boolean;
  get cancelError(): CancelError | undefined;

  // Cancellation utilities
  throwIfCancelled(): void;
  onCancel(callback: (reason?: unknown) => void): void;

  // Promise wrapping
  wrap<T>(promise: Promise<T>): Promise<T>;

  // Time utilities
  sleep(ms: number): Promise<void>;
  delay(ms: number, value?: number): Promise<number>;
  interval(ms: number, callback: () => void): () => void;
}
```

### Properties

| Property | Type | Description |
| --- | --- | --- |
| `signal` | `AbortSignal` | The underlying `AbortSignal`. Can be passed to native APIs like `fetch`. |
| `name` | `string \| undefined` | The name assigned to the task (from `CancellableOptions.name`). |
| `isCancelled` | `boolean` | `true` if the token has been cancelled. |
| `cancelError` | `CancelError \| undefined` | The `CancelError` if cancelled, otherwise `undefined`. |

### Methods

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

Registers a callback that is called when the token is cancelled. Useful for cleanup.

```ts
async (token) => {
  const connection = await openConnection();
  token.onCancel(() => connection.close());
  return doWork(connection);
}
```

#### `wrap(promise)`

Wraps a promise so that it rejects with a `CancelError` if the token is cancelled. The wrapped promise also races against the cancellation signal.

```ts
async (token) => {
  const response = await token.wrap(fetch("/api/data"));
  return response.json();
}
```

> **`wrap` vs `signal`**
> Use `token.wrap(promise)` for promises that don't natively support `AbortSignal`. Use `token.signal` directly with APIs that accept it (e.g., `fetch(url, { signal: token.signal })`).

#### `sleep(ms)`

Returns a promise that resolves after `ms` milliseconds. If the token is cancelled, the sleep rejects with a `CancelError`.

```ts
async (token) => {
  await token.sleep(1000);
  console.log("1 second elapsed");
}
```

#### `delay(ms, value?)`

Similar to `sleep`, but resolves with a numeric value (the elapsed time or a provided value).

```ts
async (token) => {
  const elapsed = await token.delay(1000);
  console.log(`Waited ${elapsed}ms`);
}
```

#### `interval(ms, callback)`

Calls `callback` every `ms` milliseconds. Returns a cancel function. The interval is automatically cancelled when the token is cancelled.

```ts
async (token) => {
  const stop = token.interval(1000, () => {
    console.log("tick");
  });

  // Later, stop manually
  stop();
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
