---
title: CancelError
description: The error type thrown when a cancellable task is cancelled.
---

`CancelError` is the specific error type thrown when a cancellable operation is cancelled. It extends the standard `Error` class and carries the cancellation reason.

> **Cancellation signal**
> Catch `CancelError` to distinguish cancellation from other errors.

## Import

Root package:

```ts
import { CancelError } from "@vgerbot/async";
```

Module subpath:

```ts
import { CancelError } from "@vgerbot/async/cancellable";
```

Leaf subpath:

```ts
import { CancelError } from "@vgerbot/async/cancellable/CancelError";
```

## Quick example

```ts
import { cancellable, CancelError } from "@vgerbot/async";

const handle = cancellable(async (token) => {
  await token.sleep(5000);
  return "done";
});

setTimeout(() => handle.cancel("User navigated away"), 100);

try {
  await handle.promise;
} catch (error) {
  if (error instanceof CancelError) {
    console.log("Cancelled:", error.reason);
  } else {
    throw error; // Re-throw non-cancellation errors
  }
}
```

## API

```ts
class CancelError extends Error {
  readonly reason: unknown;

  static fromReason(reason?: unknown, cause?: unknown): CancelError;

  withRejectionSite(): CancelError;
}
```

### Properties

| Property | Type | Description |
| --- | --- | --- |
| `name` | `string` | Always `"CancelError"`. |
| `message` | `string` | Human-readable message. |
| `reason` | `unknown` | The original reason passed to `cancel()`. |
| `cause` | `unknown` | Optional cause (from `AbortError` or other source). |

### Static methods

#### `CancelError.fromReason(reason?, cause?)`

Creates a `CancelError` from a reason value. If the reason is already a `CancelError`, it may be returned as-is.

```ts
const error = CancelError.fromReason("User cancelled");
console.log(error.reason); // "User cancelled"
```

### Instance methods

#### `withRejectionSite()`

Returns a new `CancelError` with the current stack trace attached, useful for debugging where the rejection occurred.

## Error handling patterns

### Distinguishing cancellation from other errors

```ts
try {
  await handle.promise;
} catch (error) {
  if (error instanceof CancelError) {
    // Handle cancellation gracefully
    console.log("Operation was cancelled");
  } else {
    // Re-throw or handle other errors
    throw error;
  }
}
```

### Checking reason

```ts
try {
  await handle.promise;
} catch (error) {
  if (error instanceof CancelError) {
    if (error.reason === "timeout") {
      console.log("Operation timed out");
    } else if (error.reason === "user_action") {
      console.log("User cancelled");
    }
  }
}
```

### In executors

When using executors like `PoolTaskExecutor`, cancelled tasks reject with `CancelError`:

```ts
import { PoolTaskExecutor, CancelError } from "@vgerbot/async";

const executor = new PoolTaskExecutor(3);

try {
  await executor.exec(async (token) => {
    await token.sleep(5000);
  });
} catch (error) {
  if (error instanceof CancelError) {
    console.log("Task was cancelled");
  }
}
```

## TypeScript tips

Use `instanceof` to check for `CancelError`. This is the recommended pattern.

```ts
if (error instanceof CancelError) {
  // error.reason is `unknown`
  // error.cause is `unknown`
}
```

## Related APIs

- [`cancellable`](/reference/cancellable/cancellable/) — creates cancellable tasks.
- [`CancellableHandle`](/reference/cancellable/cancellable-handle/) — the handle returned by cancellable tasks.
- [`CancellableToken`](/reference/cancellable/cancellable-token/) — the token passed to tasks.
- [`timeout`](/reference/control-flow/timeout/) — wraps a task with a timeout (uses `CancelError`).
