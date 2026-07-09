---
title: queue
description: Create a concurrency-limited async worker queue with cancellation, pause/resume, and lifecycle hooks.
---

`queue` creates a long-lived worker queue. Push tasks into the queue over time, process them with a shared async worker, and observe queue state for backpressure or lifecycle coordination.

> **Best for job streams**
> Use `queue` when producers enqueue work incrementally and you need concurrency limits, pause/resume controls, idle notifications, or pending-size backpressure.

## Import

Root package:

```ts
import { queue } from "@vgerbot/async";
```

Module subpath:

```ts
import { queue } from "@vgerbot/async/control-flow";
```

Leaf subpath:

```ts
import { queue } from "@vgerbot/async/control-flow/queue";
```

## Quick example

```ts
import { queue } from "@vgerbot/async";

const imageQueue = queue(
  async (image: { id: string; url: string }, token) => {
    const response = await token.wrap(fetch(image.url));
    const blob = await response.blob();
    return { id: image.id, size: blob.size };
  },
  { concurrency: 2 },
);

const first = imageQueue.push({ id: "hero", url: "/hero.png" });
const second = imageQueue.push({ id: "avatar", url: "/avatar.png" });

const results = await Promise.all([first, second]);
await imageQueue.onIdle();

console.log(results);
```

## When to use `queue`

- **Dynamic producers**: Tasks are discovered over time instead of passed as one fixed list.
- **Worker reuse**: Every task payload is processed by the same async worker function.
- **Backpressure**: Producers need to wait for queue size or idle state before adding more work.
- **Cancelable queues**: Pending work should reject when the queue is cancelled, and running workers should receive cancellation signals.

## API

```ts
function queue<T, R>(
  worker: QueueWorker<T, R>,
  options?: QueueOptions,
): TaskQueue<T, R>;
```

### Parameters

#### `worker`

The async worker receives each queued task and a `CancellableToken` linked to queue cancellation.

```ts
type QueueWorker<T, R> = (
  task: T,
  token: CancellableToken,
) => Promise<R>;
```

#### `options`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `1` | Maximum number of concurrently running workers. Values below `1` are clamped to `1`. |
| `startPaused` | `boolean` | `false` | Start without scheduling tasks until `resume()` is called. |
| `signal` | `AbortSignal` | `undefined` | External signal that cancels the queue when aborted. |
| `name` | `string` | `undefined` | Optional name inherited from shared cancellable options. |
| `timeout` | `number` | `undefined` | Optional timeout inherited from shared cancellable options. |

### Return value

`queue` returns a `TaskQueue<T, R>`.

```ts
interface TaskQueue<T, R> {
  cancel(reason?: unknown): void;
  isCancelled(): boolean;
  push(task: T): Promise<R>;
  pushMany(tasks: T[]): Promise<R[]>;
  pause(): void;
  resume(): void;
  onIdle(): Promise<void>;
  onError(): Promise<QueueTaskError<T>>;
  onEmpty(): Promise<void>;
  onSaturated(): Promise<void>;
  onSizeLessThan(size: number): Promise<void>;
  readonly length: number;
  readonly running: number;
  readonly idle: boolean;
  readonly paused: boolean;
}
```

## Queue lifecycle

`queue` schedules tasks in FIFO order while respecting `concurrency`.

1. `push()` stores a task and returns a promise for that task result.
2. `process()` starts tasks until the queue is paused, cancelled, empty, or saturated.
3. When a task starts, `length` decreases and `running` increases.
4. When a task settles, `running` decreases and more pending tasks may start.
5. Lifecycle waiters resolve when their condition becomes true.

```ts
const q = queue(async (id: number, token) => {
  await token.sleep(100);
  return `job:${id}`;
}, { concurrency: 2 });

q.push(1);
q.push(2);
q.push(3);

await q.onSaturated();
console.log(q.running); // 2

await q.onIdle();
console.log(q.idle); // true
```

## Backpressure

Use `onSizeLessThan()` to slow producers when too many tasks are waiting.

```ts
for (const job of jobs) {
  await q.onSizeLessThan(10);
  q.push(job);
}

await q.onIdle();
```

`onSizeLessThan(size)` throws a `RangeError` when `size` is not a positive finite number.

## Pause and resume

Pausing stops new scheduling. Running tasks continue.

```ts
const q = queue(processJob, { concurrency: 2, startPaused: true });

q.push({ id: 1 });
q.push({ id: 2 });

console.log(q.paused); // true
q.resume();
await q.onIdle();
```

## Error handling

The promise returned by `push()` rejects if the worker rejects for that task. `onError()` resolves with the next task error observed by the queue.

```ts
const q = queue(async (job: { id: number }) => {
  if (job.id === 2) {
    throw new Error("Invalid job");
  }
  return job.id;
});

const nextError = q.onError();
const failed = q.push({ id: 2 });

await failed.catch(() => undefined);
console.log(await nextError);
```

## Cancellation

`cancel()` rejects pending tasks with `CancelError`. Running workers receive a cancelled token and may stop when they use `token.wrap()`, `token.sleep()`, or `token.throwIfCancelled()`.

```ts
const q = queue(async (job: { id: number }, token) => {
  await token.sleep(5_000);
  return job.id;
});

const pending = q.push({ id: 1 });
q.cancel("Route changed");

await pending;
```

After cancellation, new `push()` calls reject with `CancelError`.

## TypeScript tips

Declare task and result types on `queue` when inference is not enough.

```ts
type UploadJob = { id: string; file: File };
type UploadResult = { id: string; url: string };

const uploads = queue<UploadJob, UploadResult>(async (job, token) => {
  await token.wrap(fetch("/api/upload", { method: "POST", body: job.file }));
  return { id: job.id, url: `/files/${job.id}` };
});
```

## Related APIs

- [`auto`](/reference/control-flow/auto/) runs dependency graphs instead of job streams.
- [`PoolTaskExecutor`](/reference/executors/pool-task-executor/) schedules submitted task functions with a fixed pool.
- [Concurrency Patterns](/guides/concurrency-patterns/) compares queues with other concurrency tools.
