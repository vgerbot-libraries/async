---
title: delay
description: Create a cancellable delay that resolves after a specified duration.
---

`delay` creates a cancellable promise that resolves after the given number of milliseconds. It is the cancellable equivalent of `setTimeout` for promises.

> **Best for pauses**
> Use `delay` when you need to insert a wait between async steps, implement polling intervals, or add rate-limiting pauses in workflows.

## Import

Root package:

```ts
import { delay } from "@vgerbot/async";
```

Module subpath:

```ts
import { delay } from "@vgerbot/async/control-flow";
```

Leaf subpath:

```ts
import { delay } from "@vgerbot/async/control-flow/delay";
```

## Quick example

```ts
import { delay } from "@vgerbot/async";

// Wait 1 second
await delay(1000);
console.log("1 second elapsed");
```

## When to use `delay`

- **Pauses between steps**: Insert a wait between operations without blocking the event loop.
- **Polling intervals**: Combine with `forever` or `whilst` to poll at fixed intervals.
- **Rate-limiting**: Add delays between API calls to respect rate limits.
- **Testing**: Simulate latency in tests or development environments.

## API

```ts
function delay(
  ms: number,
  options?: CancellableOptions<void>,
): CancellableHandle<void>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `ms` | `number` | — | Delay duration in milliseconds. |
| `options` | `CancellableOptions<void>` | `undefined` | Cancellable configuration options. |

### Return value

Returns a `CancellableHandle<void>` that resolves after the delay.

```ts
const handle = delay(5000);

await handle;
handle.cancel("No longer needed");
handle.isCancelled();
handle.signal;
```

## Execution model

`delay` is built on `cancellable` and uses `CancellableToken.sleep()` internally. The sleep is cooperative—cancellation interrupts the wait immediately.

```ts
const handle = delay(10_000);

// Cancel after 1 second
setTimeout(() => handle.cancel(), 1000);

try {
  await handle;
} catch (error) {
  console.log("Delay was cancelled");
}
```

## Cancellation

`delay` supports cancellation through the standard `CancellableHandle` API. Calling `cancel()` interrupts the ongoing sleep.

```ts
const handle = delay(60_000, { name: "longWait" });

// Cancel from elsewhere
handle.cancel("User navigated away");
```

You can also pass an external `AbortSignal`:

```ts
const controller = new AbortController();

const handle = delay(5000, { signal: controller.signal });

controller.abort();
```

## TypeScript tips

`delay` returns `CancellableHandle<void>`, so the resolved value is always `undefined`. Use it in void contexts or chain it with `.then()`.

```ts
// Type-safe chaining
await delay(100);
const result = await fetch("/api/data");
```

## Related APIs

- [`timeout`](/reference/control-flow/timeout/) wraps a task with a deadline.
- [`cancellable`](/reference/cancellable/) creates a cancellable handle for custom tasks.
- [`forever`](/reference/control-flow/forever/) runs a task indefinitely until cancelled.
- [`whilst`](/reference/control-flow/whilst/) repeats a task while a condition holds.
