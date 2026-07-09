---
title: Defer
description: A deferred promise implementation with external resolve/reject control.
---

`Defer` is a deferred promise implementation that exposes `resolve` and `reject` methods externally. It provides control over promise resolution while maintaining standard Promise semantics.

> **Best for external promise control**
> Use `Defer` when you need to resolve or reject a promise from outside its executor function.

## Import

Root package:

```ts
import { Defer } from "@vgerbot/async";
```

Module subpath:

```ts
import { Defer } from "@vgerbot/async/utils";
```

Leaf subpath:

```ts
import { Defer } from "@vgerbot/async/utils/Defer";
```

## Quick example

```ts
import { Defer } from "@vgerbot/async";

const defer = new Defer<string>();

// Resolve from elsewhere
setTimeout(() => defer.resolve("hello"), 100);

const result = await defer.promise; // "hello"
```

## When to use `Defer`

- **External resolution**: Resolve a promise from outside its initial scope.
- **Event-based async**: Bridge event callbacks to promise-based code.
- **One-time triggers**: Create a promise that resolves when a condition is met.
- **Testing**: Control promise resolution in test scenarios.

## API

```ts
class Defer<T> {
  static resolve<T>(value: T): Defer<T>;
  static reject<T>(reason: unknown): Defer<T>;

  readonly promise: Promise<T>;
  readonly resolve: (value: T | PromiseLike<T>) => void;
  readonly reject: (reason?: unknown) => void;

  get resolveValue(): T | undefined;
  get rejectReason(): unknown;
  get isSettled(): boolean;

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: (value: T) => TResult1 | PromiseLike<TResult1>,
    onrejected?: (reason: unknown) => TResult2 | PromiseLike<TResult2>,
  ): Defer<TResult1 | TResult2>;

  catch<TResult = never>(
    onrejected?: (reason: unknown) => TResult | PromiseLike<TResult>,
  ): Defer<T | TResult>;

  finally(onfinally?: () => void): Defer<T>;
}
```

### Static methods

#### `Defer.resolve(value)`

Creates a pre-resolved `Defer` instance.

```ts
const defer = Defer.resolve(42);
const result = await defer.promise; // 42
```

#### `Defer.reject(reason)`

Creates a pre-rejected `Defer` instance.

```ts
const defer = Defer.reject(new Error("failed"));
try {
  await defer.promise;
} catch (error) {
  console.log(error); // Error: failed
}
```

### Properties

| Property | Type | Description |
| --- | --- | --- |
| `promise` | `Promise<T>` | The underlying promise. |
| `resolve` | `(value: T \| PromiseLike<T>) => void` | Resolve the promise. Can only be called once. |
| `reject` | `(reason?: unknown) => void` | Reject the promise. Can only be called once. |
| `resolveValue` | `T \| undefined` | The resolved value, if settled by resolving. |
| `rejectReason` | `unknown` | The rejection reason, if settled by rejecting. |
| `isSettled` | `boolean` | Whether the promise has been settled (resolved or rejected). |

### Promise-like methods

`Defer` implements `then`, `catch`, and `finally`, each returning a new `Defer` instance (not a plain `Promise`).

## Execution model

`Defer` wraps a `Promise` and exposes its `resolve` and `reject` functions. Once settled (either resolved or rejected), further calls to `resolve` or `reject` are ignored.

```ts
const defer = new Defer<number>();

// Resolve with a promise-like value
defer.resolve(Promise.resolve(42));

// Subsequent calls are ignored
defer.resolve(100); // No effect
defer.reject(new Error("too late")); // No effect

console.log(defer.isSettled); // true
console.log(defer.resolveValue); // 42
```

## Chaining

`then`, `catch`, and `finally` return new `Defer` instances, enabling chaining:

```ts
const defer = new Defer<number>();

defer
  .then((n) => n * 2)
  .then((n) => console.log(n)) // 42
  .catch((err) => console.error(err));

defer.resolve(21);
```

## Use case: event bridge

```ts
function waitForEvent(emitter: EventEmitter, event: string): Defer<void> {
  const defer = new Defer<void>();
  emitter.once(event, () => defer.resolve());
  return defer;
}

const ready = waitForEvent(server, "ready");
await ready.promise;
console.log("Server is ready");
```

## TypeScript tips

`Defer` is generic over `T`. The `resolve` method accepts `T | PromiseLike<T>`.

```ts
const defer = new Defer<string>();
defer.resolve("hello"); // OK
defer.resolve(Promise.resolve("hello")); // OK
```

## Related APIs

- [`cancellable`](/reference/cancellable/cancellable/) — creates cancellable handles.
- [`CancellableHandle`](/reference/cancellable/cancellable-handle/) — the handle type.
- [`once`](/reference/utils/once/) — executes a function only once.
