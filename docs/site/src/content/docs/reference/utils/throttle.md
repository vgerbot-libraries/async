---
title: throttle
description: Create a throttled version of an async function.
---

`throttle` creates a throttled function that executes at most once per specified wait period. It wraps `ThrottleTaskExecutor` for function-level use.

> **Best for function-level throttling**
> Use `throttle` when you want to limit how often a function can be called.

## Import

Root package:

```ts
import { throttle } from "@vgerbot/async";
```

Module subpath:

```ts
import { throttle } from "@vgerbot/async/utils";
```

Leaf subpath:

```ts
import { throttle } from "@vgerbot/async/utils/throttle";
```

## Quick example

```ts
import { throttle } from "@vgerbot/async";

const save = throttle(
  async (data: string) => {
    await fetch("/api/save", { method: "POST", body: data });
  },
  1000, // At most once per second
);

save("a"); // Executes immediately (leading)
save("b"); // Queued
save("c"); // Replaces "b"

// After 1 second, "c" executes (trailing)
```

## When to use `throttle`

- **Scroll handlers**: Throttle scroll event processing.
- **Resize handlers**: Limit layout recalculations during resize.
- **Button clicks**: Prevent rapid double-submits.
- **API call limiting**: Ensure calls don't exceed a certain frequency.

## API

```ts
function throttle<T, Args extends unknown[] = unknown[]>(
  fn: (...args: Args) => Promise<T>,
  wait: number,
  options?: ThrottleOptions,
): ThrottledFunction<T, Args>;
```

### `ThrottledFunction`

```ts
interface ThrottledFunction<T, Args extends unknown[] = unknown[]> {
  (...args: Args): Promise<T>;
  cancel(): void;
  flush(): void;
  pending(): boolean;
}
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `fn` | `(...args: Args) => Promise<T>` | — | Async function to throttle. |
| `wait` | `number` | — | Minimum milliseconds between executions. |
| `options` | `ThrottleOptions` | `undefined` | Throttle configuration. |

### `ThrottleOptions`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `leading` | `boolean` | `true` | Execute on the leading edge (first call). |
| `trailing` | `boolean` | `true` | Execute on the trailing edge (after wait). |

### Return value

Returns a throttled function with `cancel()`, `flush()`, and `pending()` methods.

| Method | Description |
| --- | --- | --- |
| `cancel()` | Cancels the pending execution. |
| `flush()` | Immediately executes the pending task. |
| `pending()` | Returns `true` if a task is waiting to execute. |

## Execution model

`throttle` creates a `ThrottleTaskExecutor` internally. The first call executes immediately (leading edge). Subsequent calls within the wait period are debounced — only the last one is retained and executed after the wait period (trailing edge).

```ts
const onScroll = throttle(
  async () => {
    const position = window.scrollY;
    await updateIndicator(position);
  },
  100,
);

window.addEventListener("scroll", onScroll);
```

### Leading only (no trailing)

```ts
const onClick = throttle(
  async () => { await submitForm(); },
  2000,
  { trailing: false },
);

// Only the first click executes; subsequent clicks within 2s are dropped
```

## Cancellation

```ts
const throttled = throttle(myFn, 1000);

throttled("data");
throttled.cancel(); // Pending execution is cancelled

if (throttled.pending()) {
  throttled.flush(); // Execute immediately
}
```

## TypeScript tips

`throttle` preserves the argument types of the original function.

```ts
const fn = (x: number, y: string): Promise<boolean> => { /* ... */ };
const throttled = throttle(fn, 500);

const result = await throttled(42, "hello"); // Promise<boolean>
```

## Related APIs

- [`ThrottleTaskExecutor`](/reference/executors/throttle-task-executor/) — the executor backing this function.
- [`debounce`](/reference/utils/debounce/) — function-level debounce.
- [`DebounceTaskExecutor`](/reference/executors/debounce-task-executor/) — debounce executor.
- [`RateLimitExecutor`](/reference/executors/rate-limit-executor/) — rate-limited executor.
