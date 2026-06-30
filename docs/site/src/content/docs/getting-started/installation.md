---
title: Installation
description: Install @vgerbot/async and choose the right public import path for your application.
---

`@vgerbot/async` is published as an ESM TypeScript-first async utility package. Install it in the application or package where you need cancellable tasks, async control flow, queues, executors, or utility helpers.

## Install

```bash
pnpm add @vgerbot/async
```

Use your package manager of choice if the project does not use pnpm.

```bash
npm install @vgerbot/async
```

```bash
yarn add @vgerbot/async
```

## Import paths

The package exposes root imports, category subpath imports, and leaf subpath imports.

### Root package

Use the root package when bundle size is not a concern or when importing several categories together.

```ts
import { auto, cancellable, map, memoize, queue } from "@vgerbot/async";
```

### Category subpaths

Use category subpaths to make the source of each primitive explicit.

```ts
import { cancellable } from "@vgerbot/async/cancellable";
import { map } from "@vgerbot/async/collections";
import { auto, queue } from "@vgerbot/async/control-flow";
import { PoolTaskExecutor } from "@vgerbot/async/executors";
import { memoize } from "@vgerbot/async/utils";
```

### Leaf subpaths

Use leaf subpaths when importing a single API from a category.

```ts
import { auto } from "@vgerbot/async/control-flow/auto";
import { PoolTaskExecutor } from "@vgerbot/async/executors/PoolTaskExecutor";
import { memoize } from "@vgerbot/async/utils/memoize";
```

## Basic cancellable task

Most higher-level APIs build on the same cancellation model: a task receives a `CancellableToken`, and the caller receives a `CancellableHandle`.

```ts
import { cancellable } from "@vgerbot/async";

const handle = cancellable(
  async (token) => {
    await token.sleep(500);
    token.throwIfCancelled();
    return "ready";
  },
  { name: "load-widget", timeout: 2_000 },
);

setTimeout(() => {
  handle.cancel("User navigated away");
}, 100);

await handle.promise;
```

## Public API categories

| Category | Use it for | Example APIs |
| --- | --- | --- |
| Cancellable | Direct cancellation handles, tokens, retries, timeouts, and cancellation errors. | `cancellable`, `CancellableHandle`, `CancellableToken`, `CancelError` |
| Collections | Async iteration over arrays and objects with familiar collection operations. | `map`, `filter`, `reduce`, `groupBy`, `sortBy` |
| Control Flow | Coordinating multiple async tasks and long-lived worker queues. | `auto`, `parallel`, `series`, `queue`, `retry`, `timeout` |
| Executors | Reusable schedulers for submitted tasks. | `PoolTaskExecutor`, `RateLimitExecutor`, `PriorityPoolExecutor` |
| Utils | Small helpers that wrap or compose async functions. | `memoize`, `compose`, `debounce`, `throttle`, `once` |

## Next steps

- Read [Choosing APIs](/guides/choosing-apis/) to pick the right primitive.
- Start with [`auto`](/reference/control-flow/auto/) for dependency graphs.
- Use [`queue`](/reference/control-flow/queue/) for job processing and backpressure.
