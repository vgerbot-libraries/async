---
title: waterfall
description: Chain async tasks where each task receives the previous task's result.
---

`waterfall` runs a sequence of async tasks, passing the result of each task as input to the next. It is similar to `series` but explicitly focuses on the data flow from one step to the next.

> **Best for data pipelines**
> Use `waterfall` when you have a value that needs to be transformed through a series of async steps, where each step's output feeds the next.

## Import

Root package:

```ts
import { waterfall } from "@vgerbot/async";
```

Module subpath:

```ts
import { waterfall } from "@vgerbot/async/control-flow";
```

Leaf subpath:

```ts
import { waterfall } from "@vgerbot/async/control-flow/waterfall";
```

## Quick example

```ts
import { waterfall } from "@vgerbot/async";

const handle = waterfall([
  async (token) => {
    const res = await token.wrap(fetch("/api/user/1"));
    return res.json();
  },
  async (user, token) => {
    const res = await token.wrap(fetch(`/api/posts?author=${user.id}`));
    return { user, posts: await res.json() };
  },
  async ({ user, posts }, token) => {
    return `${user.name} has ${posts.length} posts`;
  },
]);

const summary = await handle.promise;
```

## When to use `waterfall`

- **Data transformation pipelines**: Pass a value through multiple async transformations.
- **Fetch-and-process chains**: Fetch data, process it, fetch more data based on results.
- **Sequential builds**: Each step augments the result of the previous step.
- **Cancellable chains**: Cancel the entire chain from outside.

## API

```ts
// Single task
function waterfall<T1>(
  tasks: [AsyncTask<T1>],
  options?: CancellableOptions<T1>,
): CancellableHandle<T1>;

// Two tasks
function waterfall<T1, T2>(
  tasks: [AsyncTask<T1>, WaterfallTask<T1, T2>],
  options?: CancellableOptions<T2>,
): CancellableHandle<T2>;

// Three tasks
function waterfall<T1, T2, T3>(
  tasks: [AsyncTask<T1>, WaterfallTask<T1, T2>, WaterfallTask<T2, T3>],
  options?: CancellableOptions<T3>,
): CancellableHandle<T3>;

// Four tasks
function waterfall<T1, T2, T3, T4>(
  tasks: [
    AsyncTask<T1>,
    WaterfallTask<T1, T2>,
    WaterfallTask<T2, T3>,
    WaterfallTask<T3, T4>,
  ],
  options?: CancellableOptions<T4>,
): CancellableHandle<T4>;
```

The first task is an `AsyncTask<T1>` (receives only a token). Subsequent tasks receive the previous result and a token.

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `tasks` | `AsyncTask[]` | — | Array of async tasks. Each task after the first receives the previous task's result. |
| `options` | `CancellableOptions<T>` | `undefined` | Cancellable configuration options. |

### Return value

Returns a `CancellableHandle<T>` that resolves to the result of the last task.

```ts
const handle = waterfall(tasks);

const result = await handle.promise;
handle.cancel("No longer needed");
handle.isCancelled();
handle.signal;
```

## Execution model

Tasks are executed sequentially. The first task receives a `CancellableToken`. Each subsequent task receives the resolved value of the previous task and the same token. If any task rejects, the waterfall stops and the handle rejects with that error.

```ts
const handle = waterfall([
  async (token) => 1,
  async (n, token) => n + 10,
  async (n, token) => n * 2,
]);

const result = await handle.promise; // 22
```

Tasks can also be `CancellableHandle` instances or `Promise` instances.

## Error handling

If any task in the waterfall rejects, the handle rejects immediately with that error. Remaining tasks are not executed.

```ts
try {
  await waterfall([
    async () => "step1",
    async () => { throw new Error("step2 failed"); },
    async () => "step3 (never runs)",
  ]).promise;
} catch (error) {
  console.log("Waterfall failed:", error);
}
```

## Cancellation

All tasks share a single `CancellableToken`. Calling `cancel()` on the handle signals cancellation to the currently running task and prevents subsequent tasks from starting.

```ts
const handle = waterfall([
  async (token) => { await token.sleep(5000); return "slow"; },
  async (result) => `${result} done`,
], { name: "dataPipeline" });

setTimeout(() => handle.cancel("User cancelled"), 100);

try {
  await handle.promise;
} catch (error) {
  if (error instanceof CancelError) {
    console.log("Waterfall was cancelled");
  }
}
```

## TypeScript tips

For up to four tasks, `waterfall` provides typed overloads so the result of each task is passed with the correct type to the next.

```ts
const handle = waterfall([
  async (token) => 10,                                    // returns number
  async (n: number, token) => `Value: ${n}`,             // receives number, returns string
  async (s: string, token) => ({ result: s }),           // receives string, returns object
]);

const result = await handle.promise; // { result: string }
```

## Related APIs

- [`series`](/reference/control-flow/series/) runs tasks sequentially with optional result passing.
- [`parallel`](/reference/control-flow/parallel/) runs tasks concurrently.
- [`auto`](/reference/control-flow/auto/) runs tasks with dependency-based scheduling.
- [`compose`](/reference/utils/compose/) composes functions right-to-left or left-to-right.
