---
title: Concurrency Patterns
description: Use @vgerbot/async to limit parallelism, model backpressure, and choose between queues and executors.
---

Concurrency controls how much async work is allowed to run at the same time. `@vgerbot/async` provides several layers so you can apply limits where they match your workflow.

## Collection concurrency

Use collection helpers when you have a fixed input collection.

```ts
import { map } from "@vgerbot/async";

const results = await map(urls, async (url) => fetch(url), { concurrency: 4 });
```

## Dependency graph concurrency

Use `auto` when tasks have dependencies but independent branches should still run together.

```ts
import { auto } from "@vgerbot/async";

const handle = auto(
  {
    config: async () => loadConfig(),
    user: [["config"], async ({ config }) => loadUser(config)],
    featureFlags: [["config"], async ({ config }) => loadFlags(config)],
  },
  { concurrency: 2 },
);
```

## Queue backpressure

Use `queue` when producers add tasks over time and need to wait for capacity.

```ts
import { queue } from "@vgerbot/async";

const q = queue(processJob, { concurrency: 3 });

for (const job of jobs) {
  await q.onSizeLessThan(10);
  q.push(job);
}

await q.onIdle();
```

## Executor pools

Use `PoolTaskExecutor` when callers submit task functions to a shared pool.

```ts
import { PoolTaskExecutor } from "@vgerbot/async";

const pool = new PoolTaskExecutor(3);

await Promise.all([
  pool.exec(loadA),
  pool.exec(loadB),
  pool.exec(loadC),
]);
```

## Choosing a pattern

- Use collection helpers for one-shot collection transformations.
- Use `auto` for dependency graphs.
- Use `queue` for long-lived job streams and backpressure.
- Use executors for reusable scheduling policies shared across call sites.

## Related APIs

- [`queue`](/reference/control-flow/queue/)
- [`auto`](/reference/control-flow/auto/)
- [`PoolTaskExecutor`](/reference/executors/pool-task-executor/)
