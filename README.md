# Async

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org/)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/eeefd61dd6e5401ca936240a2c0384f5)](https://app.codacy.com/gh/vgerbot-libraries/async/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![Codacy Badge](https://app.codacy.com/project/badge/Coverage/eeefd61dd6e5401ca936240a2c0384f5)](https://app.codacy.com/gh/vgerbot-libraries/async/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

Async is a TypeScript-first async utility library inspired by the ergonomics of `async.js` and `neo-async`.
It focuses on typed collection helpers, control-flow primitives, queueing, and cancellation support.

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

### Control Flow

- `parallel`
- `all` (alias of `parallel`)
- `series`
- `race`
- `allSettled`
- `any`
- `times`
- `whilst`
- `until`
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

## Usage

### Collections Usage

```ts
import { map } from "@vgerbot/async";

const result = await map([1, 2, 3], async (n) => n * 2);
// result: [2, 4, 6]
```

### Control Flow Usage

```ts
import { parallel, series } from "@vgerbot/async";

const data = await parallel([
  async () => "a",
  async () => "b",
]);

const ordered = await series([
  async () => 1,
  async () => 2,
]);
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
import { cancellable } from "@vgerbot/async";

const handle = cancellable(async ({ signal }) => {
  if (signal.aborted) return "cancelled";
  return "done";
});

handle.cancel();
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
