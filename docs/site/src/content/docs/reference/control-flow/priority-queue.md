---
title: priorityQueue
description: A queue that processes tasks with priority-based scheduling.
---

`priorityQueue` creates a task queue where tasks are processed based on their priority value. Higher priority values are processed first. It extends the `queue` API with priority support.

> **Best for priority-based processing**
> Use `priorityQueue` when some tasks are more urgent than others and should be processed ahead of lower-priority tasks.

## Import

Root package:

```ts
import { priorityQueue } from "@vgerbot/async";
```

Module subpath:

```ts
import { priorityQueue } from "@vgerbot/async/control-flow";
```

Leaf subpath:

```ts
import { priorityQueue } from "@vgerbot/async/control-flow/priorityQueue";
```

## Quick example

```ts
import { priorityQueue } from "@vgerbot/async";

const queue = priorityQueue(
  async (task, token) => {
    console.log(`Processing: ${task.name}`);
    await token.sleep(100);
  },
  2, // concurrency
);

queue.push({ name: "low priority" }, 1);
queue.push({ name: "high priority" }, 10);
queue.push({ name: "medium priority" }, 5);

// Processing order: high priority (10), medium priority (5), low priority (1)
```

## When to use `priorityQueue`

- **Priority processing**: Handle urgent tasks before less important ones.
- **Request scheduling**: Process premium user requests before free-tier requests.
- **Job queues**: Prioritize jobs based on business importance.
- **Background processing**: Mix high and low priority background work in one queue.

## API

```ts
function priorityQueue<T>(
  worker: (task: T, token: CancellableToken) => Promise<void>,
  concurrency?: number,
): PriorityTaskQueue<T>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `worker` | `(task, token) => Promise<void>` | — | Async function that processes each task. Receives the task data and a `CancellableToken`. |
| `concurrency` | `number` | `1` | Maximum number of tasks to process simultaneously. |

### Return value

Returns a `PriorityTaskQueue<T>` instance with the following API:

| Method/Property | Type | Description |
| --- | --- | --- |
| `push(task, priority)` | `CancellableHandle<void>` | Enqueue a single task with a priority. |
| `pushMany(tasks, priority)` | `CancellableHandle<void>` | Enqueue multiple tasks with the same priority. |
| `pause()` | `void` | Pause task processing. |
| `resume()` | `void` | Resume task processing. |
| `cancel(reason?)` | `void` | Cancel the queue and all pending tasks. |
| `isCancelled()` | `boolean` | Whether the queue has been cancelled. |
| `size` | `number` | Number of pending tasks. |
| `concurrency` | `number` | Maximum concurrent tasks (can be set). |
| `running()` | `number` | Number of currently running tasks. |
| `idle()` | `boolean` | Whether no tasks are running. |
| `onIdle()` | `Promise<void>` | Resolves when the queue becomes idle. |
| `onEmpty()` | `Promise<void>` | Resolves when the queue becomes empty. |
| `onSaturated()` | `Promise<void>` | Resolves when the queue reaches capacity. |
| `onSizeLessThan(threshold)` | `Promise<void>` | Resolves when size drops below threshold. |
| `onError()` | `Promise<unknown>` | Resolves with the first error. |

## Execution model

`priorityQueue` uses a max-heap internally to order tasks by priority. Higher priority values are dequeued first. When multiple tasks have the same priority, they are processed in FIFO order within that priority level.

```ts
const queue = priorityQueue(
  async (task, token) => {
    console.log(`[${task.priority}] ${task.name}`);
  },
  1,
);

queue.push({ name: "A", priority: 1 }, 1);
queue.push({ name: "B", priority: 5 }, 5);
queue.push({ name: "C", priority: 3 }, 3);
queue.push({ name: "D", priority: 10 }, 10);

// Processing order: D (10), B (5), C (3), A (1)
```

## Backpressure

Use `onSaturated` and `onSizeLessThan` to implement backpressure:

```ts
const queue = priorityQueue(worker, 3);

for (const item of largeDataset) {
  await queue.onSaturated(); // Wait when at capacity
  queue.push(item, item.priority);
}

await queue.onIdle(); // Wait for all tasks to complete
```

## Error handling

If a worker throws an error, the `onError` promise resolves with that error. The queue continues processing remaining tasks.

```ts
const queue = priorityQueue(async (task, token) => {
  if (task.shouldFail) throw new Error("task failed");
}, 2);

queue.push({ shouldFail: true }, 1);
queue.push({ shouldFail: false }, 1);

const error = await queue.onError();
console.log("First error:", error);
```

## Cancellation

Call `cancel()` to stop the queue. All pending tasks are rejected with a `CancelError`, and running tasks receive a cancellation signal.

```ts
const queue = priorityQueue(worker, 3);

queue.push(task1, 1);
queue.push(task2, 5);

// Cancel all pending and running tasks
queue.cancel("Shutting down");
```

## TypeScript tips

`priorityQueue` is generic over `T`, so the task type is inferred from the worker's parameter.

```ts
interface Job {
  id: number;
  data: string;
}

const queue = priorityQueue<Job>(
  async (job, token) => {
    await token.wrap(fetch(`/api/jobs/${job.id}`, { body: job.data }));
  },
  4,
);

queue.push({ id: 1, data: "hello" }, 5);
```

## Related APIs

- [`queue`](/reference/control-flow/queue/) creates a standard FIFO task queue.
- [`PriorityPoolExecutor`](/reference/executors/priority-pool-executor/) is an executor with priority support.
- [`PoolTaskExecutor`](/reference/executors/pool-task-executor/) is a pool-based executor.
- [`parallel`](/reference/control-flow/parallel/) runs tasks concurrently without a queue.
