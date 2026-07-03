---
title: Integrating with Web APIs
description: Use CancellableHandle's AbortSignal with standard Web APIs like fetch and addEventListener.
---

`CancellableHandle` exposes an `AbortSignal` that can be passed directly to Web APIs that support it. When the handle is cancelled, the signal aborts — and any API observing that signal stops automatically. This means you get cooperative cancellation for `fetch`, event listeners, streams, and more without manual cleanup.

## fetch

`fetch` accepts `AbortSignal` via the `signal` option. Pass `token.signal` directly — when the handle is cancelled, the in-flight request is aborted.

```ts
import { cancellable, CancelError } from "@vgerbot/async";

const handle = cancellable(async (token) => {
  const res = await fetch("/api/data", { signal: token.signal });
  return res.json();
});

// Cancel the in-flight request
handle.cancel("User navigated away");

try {
  const data = await handle;
} catch (error) {
  if (error instanceof CancelError) {
    console.log("Cancelled:", error.reason);
  }
}
```

### With retry and timeout

The library adds retry and timeout on top of raw `AbortController` — something the standard API doesn't provide.

```ts
const handle = cancellable(
  async (token) => {
    const res = await fetch("/api/data", { signal: token.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  {
    name: "fetch-data",
    timeout: 5_000,
    retry: { maxAttempts: 3, delay: 1_000, backOff: "exponential" },
  },
);
```

If the request times out or fails, the library retries automatically. Calling `handle.cancel()` stops everything immediately — no more retries, no pending requests.

## addEventListener

`EventTarget.addEventListener` accepts `AbortSignal` in the options object. When the signal aborts, the listener is automatically removed — no need to call `removeEventListener` manually.

```ts
import { cancellable, Defer } from "@vgerbot/async";

const handle = cancellable(async (token) => {
  // Wait for a button click, but cancel if the user navigates 
  const defer = new Defer<MouseEvent>();
  button.addEventListener("click", defer.resolve, {
      once: true,
      signal: token.signal,
  });
  return (await defer).target;
});

// If cancelled before the click, the listener is auto-removed
handle.cancel("Dialog closed");
```

This is especially useful for one-shot event waits inside cancellable tasks — the cleanup happens automatically.

## Combining fetch and event listeners

A realistic scenario: poll an API while listening for `visibilitychange` to pause when the tab is hidden. Cancelling the handle cleans up everything at once.

```ts
import { cancellable } from "@vgerbot/async";

const handle = cancellable(async (token) => {
  let paused = false;

  // Auto-removed listener — no manual cleanup needed
  document.addEventListener(
    "visibilitychange",
    () => {
      paused = document.hidden;
    },
    { signal: token.signal },
  );

  // Cancellable interval — stops on cancel
  const pollHandle = token.interval(async () => {
    if (paused) return;
    const res = await fetch("/api/status", { signal: token.signal });
    if (res.ok) {
      const data = await res.json();
      console.log("Status:", data.status);
    }
  }, 5_000);

  await pollHandle;
});

// Later: cancel everything — fetch aborts, listener removed, interval stops
handle.cancel("Component unmounted");
```

When `handle.cancel()` is called:

1. The `fetch` request is aborted (if in-flight).
2. The `visibilitychange` listener is automatically removed.
3. The `token.interval` stops and resolves silently.

## Other Web APIs supporting AbortSignal

| API | Usage |
| --- | --- |
| `fetch()` | `fetch(url, { signal })` — aborts the request |
| `addEventListener()` | `el.addEventListener(type, fn, { signal })` — auto-removes listener |
| `ReadableStream` | `reader.read(signal)` — aborts stream reading |
| `AbortSignal.timeout(ms)` | Combine with `AbortSignal.any([token.signal, AbortSignal.timeout(5000)])` for custom timeouts |
| `navigator.locks.request()` | `navigator.locks.request(name, { signal }, callback)` — releases the lock |
| `navigator.permissions.query()` | `navigator.permissions.query({ name, signal })` |
| `showOpenFilePicker()` / `showSaveFilePicker()` | `{ signal }` option — cancels the picker dialog |
| `RTCPeerConnection.createOffer()` | `pc.createOffer({ signal })` — aborts SDP creation |

For APIs that don't natively support `AbortSignal`, use `token.wrap(promise)` instead — it races the promise against cancellation.

## Related APIs

- [`cancellable`](/reference/cancellable/cancellable/) — creates a task with a `CancellableToken`.
- [`CancellableHandle`](/reference/cancellable/cancellable-handle/) — the handle returned to the caller, exposes `signal`.
- [`CancellableToken`](/reference/cancellable/cancellable-token/) — the token passed to the task, exposes `signal`.
- [Cancellation and Timeouts](/guides/cancellation-and-timeouts/) — the core cancellation model.
