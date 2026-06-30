---
title: Cancellable
description: Core cancellation handles, tokens, errors, and task options used across @vgerbot/async.
---

The cancellable module is the foundation for APIs that can be stopped, timed out, retried, or linked to an external `AbortSignal`.

## Import

```ts
import { cancellable, CancellableHandle, CancellableToken, CancelError } from "@vgerbot/async";
```

```ts
import { cancellable } from "@vgerbot/async/cancellable";
```

## APIs

| API | Kind | Description |
| --- | --- | --- |
| `cancellable` | function | Runs an async task and returns a `CancellableHandle`. |
| `CancellableHandle` | class | Promise-like handle with `promise`, `cancel()`, `isCancelled()`, and `signal`. |
| `CancellableToken` | class | Task-side token with `wrap()`, `sleep()`, `delay()`, `interval()`, `throwIfCancelled()`, and `onCancel()`. |
| `CancelError` | class | Error type used to represent cancellation. |
| `CancellableOptions` | interface | Shared options for `name`, `signal`, `timeout`, `retry`, `fallback`, `onCancel`, and `onRetry`. |
| `RetryOptions` | interface | Retry configuration with `maxAttempts`, `delay`, `retryIf`, and `backOff`. |

## Basic example

```ts
import { cancellable } from "@vgerbot/async";

const handle = cancellable(
  async (token) => {
    await token.sleep(250);
    return "ready";
  },
  { name: "prepare", timeout: 1_000 },
);

handle.cancel("Route changed");
```

## Related APIs

- [`auto`](/reference/control-flow/auto/) passes a `CancellableToken` to every dependency task.
- [`queue`](/reference/control-flow/queue/) links queue cancellation to worker tokens.
- [`memoize`](/reference/utils/memoize/) wraps cached and uncached calls in `CancellableHandle` instances.
