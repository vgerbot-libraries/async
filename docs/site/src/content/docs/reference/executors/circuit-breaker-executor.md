---
title: CircuitBreakerExecutor
description: A task executor implementing the circuit breaker pattern to prevent cascading failures.
---

`CircuitBreakerExecutor` wraps task execution with a circuit breaker that tracks failures and prevents calls to a failing service. It cycles through CLOSED, OPEN, and HALF_OPEN states.

> **Best for resilient service calls**
> Use `CircuitBreakerExecutor` when calling external services that may fail, to avoid cascading failures and allow recovery time.

## Import

Root package:

```ts
import { CircuitBreakerExecutor } from "@vgerbot/async";
```

Module subpath:

```ts
import { CircuitBreakerExecutor } from "@vgerbot/async/executors";
```

Leaf subpath:

```ts
import { CircuitBreakerExecutor } from "@vgerbot/async/executors/CircuitBreakerExecutor";
```

## Quick example

```ts
import { CircuitBreakerExecutor } from "@vgerbot/async";

const breaker = new CircuitBreakerExecutor({
  failureThreshold: 5,     // Open after 5 consecutive failures
  successThreshold: 3,     // Close after 3 consecutive successes in half-open
  resetTimeout: 10_000,    // Wait 10s before transitioning to half-open
});

for (let i = 0; i < 10; i++) {
  try {
    const result = await breaker.exec(async (token) => {
      return fetch("/api/unstable-service");
    }).promise;
  } catch (error) {
    console.log(`Request ${i} failed:`, error.message);
  }
}

console.log("Circuit state:", breaker.getState()); // "closed" | "open" | "half_open"
```

## When to use `CircuitBreakerExecutor`

- **External service calls**: Protect against cascading failures when a dependency is down.
- **Database connections**: Avoid hammering a database that is temporarily unavailable.
- **API gateways**: Prevent requests to a failing downstream service.
- **Microservice resilience**: Isolate failures in a microservice architecture.

## API

```ts
type CircuitState = "closed" | "open" | "half_open";

class CircuitBreakerExecutor extends BaseTaskExecutor {
  constructor(options: CircuitBreakerOptions);

  exec<T>(task: AsyncTask<T>, options?: TaskOptions): PromiseLike<T>;
  cancel(reason?: unknown): void;
  isCancelled(): boolean;

  getState(): CircuitState;
  reset(): void;
}
```

### Constructor

```ts
new CircuitBreakerExecutor(options: CircuitBreakerOptions)
```

### `CircuitBreakerOptions`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `failureThreshold` | `number` | `5` | Number of consecutive failures before opening the circuit. |
| `successThreshold` | `number` | `3` | Number of consecutive successes in half-open state before closing. |
| `resetTimeout` | `number` | `10_000` | Milliseconds to wait in open state before transitioning to half-open. |

### Methods

#### `exec(task, options?)`

Submits a task. If the circuit is open, the task is rejected immediately with a `CircuitBreakerOpenError`. If the circuit is closed or half-open, the task is executed and its success/failure updates the breaker state.

#### `getState()`

Returns the current circuit state: `"closed"`, `"open"`, or `"half_open"`.

#### `reset()`

Manually resets the circuit breaker to the closed state, clearing all failure and success counters.

## Execution model

### States

- **CLOSED**: Tasks are executed normally. Failures increment the failure counter. When failures reach `failureThreshold`, the circuit opens.
- **OPEN**: Tasks are rejected immediately without execution. After `resetTimeout` milliseconds, the circuit transitions to half-open.
- **HALF_OPEN**: A limited number of tasks are allowed through. Successes increment the success counter; failures re-open the circuit. When successes reach `successThreshold`, the circuit closes.

```text
CLOSED --(failures >= threshold)--> OPEN
OPEN --(resetTimeout elapsed)--> HALF_OPEN
HALF_OPEN --(successes >= threshold)--> CLOSED
HALF_OPEN --(any failure)--> OPEN
```

## Error handling

### Task failures

When a task fails in the closed state, the failure is counted. If the failure threshold is reached, the circuit opens.

### Circuit open

When the circuit is open, `exec` rejects immediately with a `CircuitBreakerOpenError`:

```ts
try {
  await breaker.exec(async () => {
    return fetch("/api/service");
  });
} catch (error) {
  if (error instanceof CircuitBreakerOpenError) {
    console.log("Circuit is open — service likely down");
  } else {
    console.log("Task failed:", error);
  }
}
```

### Manual reset

```ts
// Force reset after fixing the downstream service
breaker.reset();
console.log(breaker.getState()); // "closed"
```

## Cancellation

Calling `cancel()` permanently disables the executor. All pending tasks are rejected.

## TypeScript tips

`exec` is generic over `T`.

```ts
const result = await breaker.exec(async (token) => {
  const res = await token.wrap(fetch("/api/data"));
  return res.json() as Promise<{ status: string }>;
}).promise;
```

## Related APIs

- [`PoolTaskExecutor`](/reference/executors/pool-task-executor/) — concurrency-limited pool.
- [`RateLimitExecutor`](/reference/executors/rate-limit-executor/) — rate-limited executor.
- [`retry`](/reference/control-flow/retry/) — retry individual tasks on failure.
- [`timeout`](/reference/control-flow/timeout/) — wrap tasks with a deadline.
- [`ITaskExecutor`](/reference/executors/itask-executor/) — common executor interface.
