---
title: constant
description: Return a constant value wrapped in a cancellable promise.
---

`constant` creates a `CancellableHandle` that always resolves to the given value. Useful for creating async functions that return fixed values.

> **Best for stubs and defaults**
> Use `constant` when you need a cancellable handle that resolves to a predetermined value.

## Import

Root package:

```ts
import { constant } from "@vgerbot/async";
```

Module subpath:

```ts
import { constant } from "@vgerbot/async/utils";
```

Leaf subpath:

```ts
import { constant } from "@vgerbot/async/utils/constant";
```

## Quick example

```ts
import { constant } from "@vgerbot/async";

const handle = constant(42);
const result = await handle.promise; // 42
```

## When to use `constant`

- **Stub functions**: Create async stubs that return fixed values for testing.
- **Default values**: Provide a cancellable handle that resolves to a default.
- **Pipeline placeholders**: Insert a constant value into an async pipeline.
- **Mock implementations**: Replace real async functions with constant returns.

## API

```ts
function constant<T>(
  value: T,
  options?: CancellableOptions<T>,
): CancellableHandle<T>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `T` | — | The constant value to resolve with. |
| `options` | `CancellableOptions<T>` | `undefined` | Cancellable configuration options. |

### Return value

Returns a `CancellableHandle<T>` that resolves to `value`.

## Execution model

`constant` wraps the value in a `cancellable` call. The value is returned immediately in the async function body.

```ts
const handle = constant({ id: 1, name: "default" });
const config = await handle.promise; // { id: 1, name: "default" }
```

## Cancellation

Since the value is returned immediately, cancellation has limited effect. However, the `CancellableOptions` are passed through, so `timeout` and `signal` still apply.

```ts
const controller = new AbortController();
const handle = constant("result", { signal: controller.signal });

controller.abort(); // Cancels before the microtask runs
```

## TypeScript tips

`constant` is generic over `T`, so the return type is inferred from the value.

```ts
const handle = constant("hello"); // CancellableHandle<string>
const handle2 = constant(42);     // CancellableHandle<number>
const handle3 = constant(null);   // CancellableHandle<null>
```

## Related APIs

- [`cancellable`](/reference/cancellable/cancellable/) — the primitive used by `constant`.
- [`asyncify`](/reference/utils/asyncify/) — wraps sync functions.
- [`once`](/reference/utils/once/) — executes a function only once.
- [`noop`](/reference/utils/noop/) — a no-op function.
