---
title: auto
description: Run a dependency graph of asynchronous tasks with cancellation, concurrency limits, and typed results.
---

`auto` runs named asynchronous tasks in dependency order. Use it when each task may depend on the results of other tasks and independent tasks should still run concurrently.

> **Best for dependency graphs**
> Use `auto` for workflows such as loading configuration, fetching user data, preparing dependent requests, and combining the final result after all prerequisites are available.

## Import

Root package:

```ts
import { auto } from "@vgerbot/async";
```

Module subpath:

```ts
import { auto } from "@vgerbot/async/control-flow";
```

Leaf subpath:

```ts
import { auto } from "@vgerbot/async/control-flow/auto";
```

## Quick example

Each task is declared by name. A task can be either a function with no dependencies or a tuple of `[dependencies, task]`.

```ts
import { auto } from "@vgerbot/async";

const handle = auto<{
  config: { baseUrl: string };
  user: { id: number; name: string };
  posts: Array<{ id: number; title: string }>;
  summary: string;
}>(
  {
    config: async () => ({ baseUrl: "https://api.example.com" }),

    user: [
      ["config"],
      async ({ config }, token) => {
        await token.sleep(100);
        const response = await token.wrap(
          fetch(`${config.baseUrl}/users/1`),
        );
        return response.json();
      },
    ],

    posts: [
      ["config", "user"],
      async ({ config, user }, token) => {
        const response = await token.wrap(
          fetch(`${config.baseUrl}/users/${user.id}/posts`),
        );
        return response.json();
      },
    ],

    summary: [
      ["user", "posts"],
      async ({ user, posts }) => {
        return `${user.name} has ${posts.length} posts`;
      },
    ],
  },
  { concurrency: 2 },
);

const result = await handle;

console.log(result.summary);
```

## When to use `auto`

- **Dependent async work**: Model workflows where each step has named prerequisites and consumes their results.
- **Parallel where possible**: Independent tasks are scheduled concurrently, while dependent tasks wait for their inputs.
- **Typed result maps**: Describe the final result shape once and get strongly typed dependency inputs.
- **Cancelable workflows**: Every task receives a `CancellableToken`, and the returned handle can stop the graph.

## API

```ts
function auto<TResults extends Record<string, unknown>>(
  tasks: AutoTasks<TResults>,
  options: AutoResolveOptions<TResults>,
): CancellableHandle<AutoResolveResult<TResults>>;

function auto<TResults extends Record<string, unknown>>(
  tasks: AutoTasks<TResults>,
  options?: AutoRejectOptions<TResults>,
): CancellableHandle<AutoResult<TResults>>;
```

### Parameters

#### `tasks`

A map where each key is a task name and each value describes how that task should run.

```ts
type AutoTasks<TResults extends Record<string, unknown>> = {
  [K in keyof TResults]: AutoTask<TResults, TResults[K]>;
};
```

A task can be written in two forms:

```ts
const taskWithoutDependencies = async (results, token) => value;

const taskWithDependencies = [
  ["dependencyA", "dependencyB"],
  async (results, token) => value,
];
```

The `results` object only contains completed dependencies. When dependencies are declared with tuple syntax, TypeScript narrows `results` to the named dependencies.

#### `options`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `Infinity` | Maximum number of active tasks. Values below `1` are normalized to `1`. |
| `errorMode` | `"reject" \| "resolve"` | `"reject"` | Controls whether task failures reject the handle or resolve with partial results and an error. |
| `name` | `string` | `"auto"` | Name used in cancellation and task error labels. |
| `signal` | `AbortSignal` | `undefined` | External signal linked to the workflow. |
| `timeout` | `number` | `undefined` | Cancels the workflow after the specified milliseconds. |
| `fallback` | value or function | `undefined` | Fallback value used by the underlying cancellable task when it rejects. |
| `retry` | `RetryOptions` | `undefined` | Retry configuration applied to the whole `auto` workflow. |
| `onCancel` | function | `undefined` | Called when the workflow is cancelled. |
| `onRetry` | function | `undefined` | Called before a retry attempt. |

### Return value

`auto` returns a `CancellableHandle`.

```ts
const handle = auto(tasks);

await handle;
handle.cancel("No longer needed");
handle.isCancelled();
handle.signal;
```

In default reject mode, `handle` resolves to the complete result map.

```ts
const results = await auto(tasks);
```

In resolve mode, `handle` always resolves to an object containing partial results and an optional `AutoExecutionError`.

```ts
const { results, error } = await auto(tasks, {
  errorMode: "resolve",
});
```

## Dependency execution model

`auto` repeatedly schedules ready tasks until the graph completes or fails.

1. Parse task declarations.
2. Validate that every dependency points to a known task.
3. Start tasks whose dependencies are already completed.
4. Respect `concurrency` while scheduling more ready tasks.
5. Store each task result by its task name.
6. Stop scheduling new tasks after the first non-cancellation error.
7. Wait for already active tasks to settle before returning or throwing.

```ts
const handle = auto(
  {
    a: async () => "a",
    b: async () => "b",
    c: [["a", "b"], async ({ a, b }) => `${a}${b}`],
  },
  { concurrency: 2 },
);

console.log(await handle);
// { a: "a", b: "b", c: "ab" }
```

## Error handling

### Reject mode

Reject mode is the default. If a task fails, `handle` rejects with `AutoExecutionError`.

```ts
import { AutoExecutionError, auto } from "@vgerbot/async";

const handle = auto<{
  user: { id: number };
  posts: unknown[];
}>({
  user: async () => ({ id: 1 }),
  posts: [
    ["user"],
    async () => {
      throw new Error("Posts service unavailable");
    },
  ],
});

try {
  await handle;
} catch (error) {
  if (error instanceof AutoExecutionError) {
    console.log(error.taskName);
    console.log(error.cause);
    console.log(error.partialResults);
  }
}
```

### Resolve mode

Resolve mode is useful when partial results are valuable and failure should be handled as data.

```ts
const { results, error } = await auto<{
  profile: { id: number };
  recommendations: string[];
}>(
  {
    profile: async () => ({ id: 1 }),
    recommendations: [
      ["profile"],
      async () => {
        throw new Error("Recommendation service failed");
      },
    ],
  },
  { errorMode: "resolve" },
);

if (error) {
  console.log(results.profile);
  console.warn(error.message);
}
```

## Cancellation

Every task receives a `CancellableToken`. Use it to make sleeps, fetches, nested handles, and explicit checks react to cancellation.

```ts
const handle = auto(
  {
    slowTask: async (_results, token) => {
      await token.sleep(5_000);
      token.throwIfCancelled();
      return "done";
    },
  },
  { name: "loadDashboard" },
);

setTimeout(() => {
  handle.cancel("User navigated away");
}, 100);

await handle;
```

> **Cancellation rejects with `CancelError`**
> When cancellation occurs, `auto` propagates the cancellation error instead of wrapping it in `AutoExecutionError`.

## Invalid dependency graphs

`auto` validates dependency names before running tasks.

```ts
await auto({
  user: [["missingConfig"], async () => ({ id: 1 })],
});

// Error: auto task "user" depends on unknown task "missingConfig"
```

If tasks cannot be resolved because of a cycle, the promise rejects with a cycle error.

```ts
await auto({
  a: [["b"], async () => 1],
  b: [["a"], async () => 2],
});

// Error: auto cannot resolve dependencies (possible cycle): a[b]; b[a]
```

## TypeScript tips

Use a result map type to make dependency inputs precise.

```ts
type WorkflowResults = {
  config: { apiUrl: string };
  session: { token: string };
  dashboard: { widgets: string[] };
};

const handle = auto<WorkflowResults>({
  config: async () => ({ apiUrl: "/api" }),
  session: [["config"], async ({ config }) => ({ token: config.apiUrl })],
  dashboard: [
    ["config", "session"],
    async ({ config, session }) => ({
      widgets: [`${config.apiUrl}:${session.token}`],
    }),
  ],
});
```

Use `as const` when TypeScript widens dependency arrays too much.

```ts
const handle = auto<WorkflowResults>({
  config: [[], async () => ({ apiUrl: "/api" })] as const,
  session: [["config"], async ({ config }) => ({ token: config.apiUrl })] as const,
  dashboard: [
    ["config", "session"],
    async ({ config, session }) => ({
      widgets: [`${config.apiUrl}:${session.token}`],
    }),
  ] as const,
});
```

## Related APIs

- [`parallel`](/reference/control-flow/parallel/) runs independent tasks concurrently.
- [`series`](/reference/control-flow/series/) runs tasks one after another.
- [`waterfall`](/reference/control-flow/waterfall/) passes each task result into the next task.
- [`queue`](/reference/control-flow/queue/) manages a long-lived worker queue.
- [`cancellable`](/reference/cancellable/) creates a cancellable handle directly.
