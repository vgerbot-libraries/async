---
title: Choosing APIs
description: Pick the right @vgerbot/async primitive for collections, control flow, task execution, and utilities.
---

`@vgerbot/async` is organized by the shape of the async problem you need to solve. Start with the smallest primitive that directly models your workflow.

## Quick decision table

| If you need to... | Start with | Why |
| --- | --- | --- |
| Run async work for every item in an array or object | Collections | Helpers such as `map`, `filter`, and `reduce` keep collection-shaped code direct. |
| Run named tasks with dependencies | [`auto`](/reference/control-flow/auto/) | It schedules tasks when their dependencies are complete and keeps a typed result map. |
| Process a stream of jobs over time | [`queue`](/reference/control-flow/queue/) | It accepts tasks incrementally and exposes backpressure and lifecycle hooks. |
| Submit arbitrary tasks to a reusable scheduler | Executors | Executors encapsulate pooling, rate limiting, priority scheduling, or debounce/throttle behavior. |
| Cache, compose, debounce, or adapt functions | Utils | Utilities wrap individual functions without changing your larger workflow model. |
| Build a custom cancellation-aware operation | Cancellable | `cancellable` exposes the raw handle/token model used by higher-level APIs. |

## Collections vs control flow

Use collection helpers when the input is already a collection and each item can be transformed or tested with a consistent iterator.

```ts
import { map } from "@vgerbot/async";

const users = await map(ids, async (id) => fetchUser(id), { concurrency: 4 });
```

Use control-flow helpers when the workflow itself is the important structure.

```ts
import { auto } from "@vgerbot/async";

const handle = auto({
  user: async () => fetchUser(1),
  posts: [["user"], async ({ user }) => fetchPosts(user.id)],
});
```

## Queue vs executor

Use `queue` when producers push jobs over time and consumers need lifecycle signals such as `onIdle()`, `onEmpty()`, `onSaturated()`, or `onSizeLessThan()`.

```ts
import { queue } from "@vgerbot/async";

const uploads = queue(uploadFile, { concurrency: 3 });
uploads.push(fileA);
uploads.push(fileB);
await uploads.onIdle();
```

Use an executor when you want to submit tasks to a reusable scheduling policy.

```ts
import { PoolTaskExecutor } from "@vgerbot/async";

const executor = new PoolTaskExecutor(3);
const result = await executor.exec(async (token) => {
  await token.sleep(100);
  return "done";
});
```

## Utility wrappers

Utilities are best when the workflow is simple but one function needs specific behavior.

```ts
import { memoize } from "@vgerbot/async";

const getUser = memoize(async (id: number, token) => {
  const response = await token.wrap(fetch(`/api/users/${id}`));
  return response.json();
});
```

## Recommended MVP path

1. Learn the cancellation model in [Installation](/getting-started/installation/).
2. Read [`auto`](/reference/control-flow/auto/) to understand reference page depth.
3. Read [`queue`](/reference/control-flow/queue/) for long-lived job processing.
4. Read [`PoolTaskExecutor`](/reference/executors/pool-task-executor/) for executor semantics.
5. Read [`memoize`](/reference/utils/memoize/) for utility wrapper patterns.
