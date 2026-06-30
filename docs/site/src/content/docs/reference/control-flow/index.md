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
| `priorityQueue` | Processes queued jobs by priority. |
| `parallel` | Runs independent tasks concurrently. |
| `series` | Runs tasks sequentially. |
| `waterfall` | Passes each task result into the next task. |
| `race` | Resolves or rejects with the first settled task. |
| `allSettled` | Waits for all tasks and returns every outcome. |
| `any` | Resolves with the first successful task. |
| `times` | Runs an async task a fixed number of times. |
| `whilst` | Repeats while a condition remains true. |
| `delay` | Creates a delayed async result. |
| `timeout` | Applies a timeout to async work. |
| `retry` | Retries async work according to retry options. |
| `tryEach` | Tries tasks until one succeeds. |
| `reflect` | Converts rejection into a resolved result object. |
| `forever` | Repeats async work until it fails or is cancelled. |

## MVP details

- [`auto`](/reference/control-flow/auto/) is the canonical full-depth page for dependency graphs.
- [`queue`](/reference/control-flow/queue/) is the canonical full-depth page for long-lived job processing.

## Related APIs

- [Concurrency Patterns](/guides/concurrency-patterns/)
- [Executors](/reference/executors/)
- [Cancellable](/reference/cancellable/)
