---
title: Control Flow
description: Coordinate async tasks with dependency graphs, queues, retries, timeouts, and execution ordering.
---

Control-flow helpers model how async tasks relate to one another. Use them when the workflow shape matters more than a single function call.

## Import

```ts
import { auto, queue, parallel, series } from "@vgerbot/async";
```

```ts
import { auto, queue } from "@vgerbot/async/control-flow";
```

## APIs

| API | Description |
| --- | --- |
| [`auto`](/reference/control-flow/auto/) | Runs a dependency graph of named async tasks. |
| [`queue`](/reference/control-flow/queue/) | Creates a concurrency-limited worker queue for jobs pushed over time. |
| [`priorityQueue`](/reference/control-flow/priority-queue/) | Processes queued jobs by priority. |
| [`parallel`](/reference/control-flow/parallel/) | Runs independent tasks concurrently. |
| [`series`](/reference/control-flow/series/) | Runs tasks sequentially. |
| [`waterfall`](/reference/control-flow/waterfall/) | Passes each task result into the next task. |
| [`race`](/reference/control-flow/race/) | Resolves or rejects with the first settled task. |
| [`allSettled`](/reference/control-flow/all-settled/) | Waits for all tasks and returns every outcome. |
| [`any`](/reference/control-flow/any/) | Resolves with the first successful task. |
| [`times`](/reference/control-flow/times/) | Runs an async task a fixed number of times. |
| [`whilst`](/reference/control-flow/whilst/) | Repeats while a condition remains true. |
| [`delay`](/reference/control-flow/delay/) | Creates a delayed async result. |
| [`timeout`](/reference/control-flow/timeout/) | Applies a timeout to async work. |
| [`retry`](/reference/control-flow/retry/) | Retries async work according to retry options. |
| [`tryEach`](/reference/control-flow/try-each/) | Tries tasks until one succeeds. |
| [`reflect`](/reference/control-flow/reflect/) | Converts rejection into a resolved result object. |
| [`forever`](/reference/control-flow/forever/) | Repeats async work until it fails or is cancelled. |

## Related APIs

- [Concurrency Patterns](/guides/concurrency-patterns/)
- [Executors](/reference/executors/)
- [Cancellable](/reference/cancellable/)
