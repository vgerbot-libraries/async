# Async

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org/)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/eeefd61dd6e5401ca936240a2c0384f5)](https://app.codacy.com/gh/vgerbot-libraries/async/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![Codacy Badge](https://app.codacy.com/project/badge/Coverage/eeefd61dd6e5401ca936240a2c0384f5)](https://app.codacy.com/gh/vgerbot-libraries/async/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

A TypeScript-first async utility library that provides typed collection helpers, control-flow primitives, queueing, and cancellation support for modern async workflows.

## Installation

### Package usage

```bash
pnpm add @vgerbot/async
```

```ts
import { map, parallel, queue, cancellable } from "@vgerbot/async";
```

### Repository development

```bash
pnpm install
pnpm build
pnpm test
```

## Feature

### Collections

- `each`
- `map`
- `mapValues`
- `filter`
- `reject`
- `detect`
- `some`
- `every`
- `reduce`
- `groupBy`
- `concat`
- `sortBy`
- `pick`
- `omit`
- `transform`

### Control Flow

- `parallel`
- `all` (alias of `parallel`)
- `series`
- `waterfall`
- `race`
- `allSettled`
- `any`
- `times`
- `whilst`
- `doWhilst`
- `until`
- `doUntil`
- `auto`
- `queue`

### Cancellable

- `cancellable`
- `CancellableToken`
- `CancellableHandle`
- `CancelError`

### Executors

- `DebounceTaskExecutor`
- `ThrottleTaskExecutor`
- `PoolTaskExecutor`
- `SeriesTaskExecutor`

### Utils

- `Defer`
- `memoize`
- `compose`
- `seq`

## Usage

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

## Development

### Scripts

- `pnpm dev` - Run workspace development tasks.
- `pnpm build` - Build all packages.
- `pnpm test` - Run tests in all workspaces.
- `pnpm lint` - Run Biome lint checks.
- `pnpm format` - Apply Biome formatting and safe fixes.
- `pnpm check-types` - Run TypeScript checks.
- `pnpm docs:api` - Generate API documentation.

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting pull requests.

## License

MIT
