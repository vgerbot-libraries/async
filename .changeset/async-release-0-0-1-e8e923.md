---
"@vgerbot/async": patch
---

Initial release of `@vgerbot/async` — a TypeScript-first async utility library focused on cancellable async workflows, concurrency-limited collections, control-flow primitives, and task executors.

### Modules

- **cancellable** — `AsyncTask`, `CancellableHandle`, `CancellableToken`, `CancelError`, and `cancellable()` for cooperative cancellation of async operations.
- **collections** — Concurrency-limited async collection methods: `map`, `filter`, `each`, `reduce`, `groupBy`, `sortBy`, `partition`, `pick`, `omit`, `detect`, `some`, `every`, `flatMap`, `transform`, and more.
- **control-flow** — Control-flow primitives: `auto`, `parallel`, `series`, `waterfall`, `retry`, `timeout`, `race`, `allSettled`, `any`, `reflect`, `tryEach`, `whilst`, `forever`, `times`, `delay`, `queue`, and `priorityQueue` with Promise-based one-shot lifecycle events (`onError`, `onEmpty`, `onSaturated`, `onSizeLessThan`, `onIdle`).
- **executors** — Task executors with cancellation and lifecycle management: `PoolTaskExecutor`, `PriorityPoolExecutor`, `SeriesTaskExecutor`, `RateLimitExecutor`, `ThrottleTaskExecutor`, `DebounceTaskExecutor`, and `CircuitBreakerExecutor`.
- **utils** — Utility helpers: `asyncify`, `memoize`, `cache`, `compose`, `concurrency`, `debounce`, `throttle`, `once`, `constant`, `noop`, `Defer`, and internal `Queue`.

### Features

- Full TypeScript type safety with inference-based dependency resolution (e.g. `auto`).
- Subpath imports supported via `exports` map (e.g. `@vgerbot/async/control-flow`, `@vgerbot/async/collections`).
- Cancellation propagation through `CancellableToken` and `CancellableHandle`.
- `auto` supports fail-fast stop-scheduling with partial results via `AutoExecutionError`, plus an optional resolve mode returning `{ results, error }`.
