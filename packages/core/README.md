# @vgerbot/async

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/vgerbot-libraries/async/blob/master/LICENSE)

A TypeScript-first async utility library focused on cancellable async workflows, concurrency-limited collections, control-flow primitives, and task executors.

## Installation

```bash
pnpm add @vgerbot/async
```

```bash
npm install @vgerbot/async
```

```bash
yarn add @vgerbot/async
```

## Usage

```ts
import { map, parallel, queue, cancellable } from "@vgerbot/async";

// Module-level subpath import
import { queue as queueFromModule } from "@vgerbot/async/control-flow";

// Leaf-level subpath import
import { auto } from "@vgerbot/async/control-flow/auto";
```

Internal implementation paths are intentionally not exported.

## Features

### Collections

Concurrency-limited async collection methods.

- `each` · `map` · `mapValues` · `filter` · `reject` · `detect` · `find` · `findIndex`
- `some` · `every` · `reduce` · `groupBy` · `concat` · `flatMap` · `partition`
- `sortBy` · `pick` · `omit` · `transform`

### Control Flow

Control-flow primitives including dependency-aware task orchestration and queue lifecycle events.

- `parallel` / `all` · `series` · `waterfall` · `race` · `allSettled` · `any`
- `times` · `whilst` · `doWhilst` · `until` · `doUntil` · `forever`
- `auto` · `queue` · `priorityQueue` · `delay` · `timeout` · `retry`
- `tryEach` · `reflect`

### Cancellable

Cooperative cancellation of async operations via tokens and handles.

- `cancellable` · `CancellableToken` · `CancellableHandle` · `CancelError`

### Executors

Task executors with cancellation and lifecycle management.

- `DebounceTaskExecutor` · `ThrottleTaskExecutor` · `PoolTaskExecutor`
- `PriorityPoolExecutor` · `SeriesTaskExecutor` · `RateLimitExecutor`
- `CircuitBreakerExecutor`

### Utils

Utility helpers for async composition and control.

- `Defer` · `Queue` · `memoize` · `compose` · `seq` · `asyncify`
- `debounce` · `throttle` · `once` · `constant` · `cache`

## Examples

### Collections Usage

```ts
import { map, concat, sortBy, pick } from "@vgerbot/async";

// Map with concurrency control
const result = await map([1, 2, 3], async (n) => n * 2);
// result: [2, 4, 6]

// Concat - map and flatten
const flattened = await concat([1, 2, 3], async (n) => [n, n * 2]);
// flattened: [1, 2, 2, 4, 3, 6]

// Sort by async criteria
const users = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }];
const sorted = await sortBy(users, async (user) => user.age);
// sorted: [{ name: 'Bob', age: 25 }, { name: 'Alice', age: 30 }]

// Pick object properties
const data = { a: 1, b: 2, c: 3 };
const picked = await pick(data, async (value) => value % 2 === 0);
// picked: { b: 2 }
```

### Control Flow Usage

```ts
import { parallel, series, waterfall, doWhilst } from "@vgerbot/async";

// Parallel execution
const data = await parallel([
  async () => "a",
  async () => "b",
]);

// Series execution
const ordered = await series([
  async () => 1,
  async () => 2,
]);

// Waterfall - pass results through pipeline
const result = await waterfall(
  async () => 5,
  async (n) => n * 2,
  async (n) => `Result: ${n}`,
);
// result: "Result: 10"

// Do-while loop
let count = 0;
await doWhilst(
  async () => { count++; },
  async () => count < 3,
);
// count: 3
```

### Queue

```ts
import { queue } from "@vgerbot/async";

const q = queue<number, number>(async (job) => job * 2, { concurrency: 2 });
q.push(1);
q.push(2);
q.push(3);

await q.onSaturated(); // running reaches concurrency
await q.onEmpty(); // pending queue becomes empty
await q.onIdle(); // pending empty + no running tasks

const nextError = await q.onError();
console.error(nextError.task, nextError.error);

await q.onSizeLessThan(2); // resolves when pending size < 2
```

### Auto

```ts
import { auto } from "@vgerbot/async";

const handle = auto<{
  config: { baseUrl: string };
  user: { id: number; url: string };
  posts: string[];
}>(
  {
    config: [[], async () => ({ baseUrl: "/api" })],
    user: [["config"], async (results) => {
      return { id: 1, url: `${results.config.baseUrl}/users/1` };
    }],
    posts: [["user"], async (results) => [`post-of-${results.user.id}`]],
  },
  { errorMode: "reject" },
);

const result = await handle.promise;
```

```ts
// Optional resolve mode returns partial results and error.
const resolved = await auto<{ a: number; b: number; c: number }>(
  {
    a: [[], async () => 1],
    b: [["a"], async (results) => results.a + 1],
    c: [["a"], async () => {
      throw new Error("failed");
    }],
  },
  { errorMode: "resolve" },
).promise;

console.log(resolved.results); // partial results
console.log(resolved.error); // AutoExecutionError | undefined
```

### Cancellation

```ts
import { cancellable, memoize, compose } from "@vgerbot/async";

// Basic cancellation
const handle = cancellable(async ({ signal }) => {
  if (signal.aborted) return "cancelled";
  return "done";
});

handle.cancel();

// Memoize async functions
const fetchUser = memoize(async (id: number, token) => {
  await token.sleep(1000);
  return { id, name: `User ${id}` };
});

const user1 = await fetchUser(1); // Takes 1 second
const user2 = await fetchUser(1); // Returns cached result immediately

// Compose async functions
const addOne = async (n: number) => n + 1;
const double = async (n: number) => n * 2;
const composed = compose(double, addOne);
const result = await composed(5); // (5 + 1) * 2 = 12
```

## License

MIT
