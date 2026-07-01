---
title: compose
description: Compose async functions right-to-left or left-to-right with cancellation support.
---

`compose` and `seq` create a new async function by chaining multiple async functions together. `compose` executes right-to-left (mathematical composition), while `seq` executes left-to-right (natural reading order).

> **Best for function pipelines**
> Use `compose` or `seq` when you need to chain async transformations into a single callable function.

## Import

Root package:

```ts
import { compose, seq } from "@vgerbot/async";
```

Module subpath:

```ts
import { compose, seq } from "@vgerbot/async/utils";
```

Leaf subpath:

```ts
import { compose } from "@vgerbot/async/utils/compose";
```

## Quick example

```ts
import { compose, seq } from "@vgerbot/async";

const addOne = async (n: number) => n + 1;
const double = async (n: number) => n * 2;
const square = async (n: number) => n * n;

// compose: right-to-left — ((5 + 1) * 2)² = 144
const composed = compose(square, double, addOne);
const result1 = await composed(5).promise; // 144

// seq: left-to-right — ((5 + 1) * 2)² = 144
const sequenced = seq(addOne, double, square);
const result2 = await sequenced(5).promise; // 144
```

## When to use

- **`compose`**: Mathematical composition (right-to-left). The rightmost function is called first.
- **`seq`**: Sequential composition (left-to-right). The leftmost function is called first. Matches visual reading order.

## API

```ts
// compose — right to left
function compose<T1, T2>(
  fn1: AsyncFunction<T1, T2>,
): (input: T1, options?: CancellableOptions) => CancellableHandle<T2>;

function compose<T1, T2, T3>(
  fn2: AsyncFunction<T2, T3>,
  fn1: AsyncFunction<T1, T2>,
): (input: T1, options?: CancellableOptions) => CancellableHandle<T3>;

// ... up to 4 functions

// seq — left to right
function seq<T1, T2>(
  fn1: AsyncFunction<T1, T2>,
): (input: T1, options?: CancellableOptions) => CancellableHandle<T2>;

function seq<T1, T2, T3>(
  fn1: AsyncFunction<T1, T2>,
  fn2: AsyncFunction<T2, T3>,
): (input: T1, options?: CancellableOptions) => CancellableHandle<T3>;

// ... up to 4 functions
```

### `AsyncFunction`

```ts
type AsyncFunction<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  token: CancellableToken,
) => Promise<TOutput> | CancellableHandle<TOutput>;
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `fns` | `AsyncFunction[]` | — | Functions to compose. Order depends on `compose` vs `seq`. |

### Return value

Returns a function `(input, options?) => CancellableHandle<TOutput>` that executes all functions in sequence.

## Execution model

Each function receives the output of the previous function and a shared `CancellableToken`. Between each step, `token.throwIfCancelled()` is called to check for cancellation.

### `compose` (right-to-left)

```ts
const fn = compose(f, g, h);
// Execution order: h → g → f
// h(input) → g(hResult) → f(gResult)
```

### `seq` (left-to-right)

```ts
const fn = seq(f, g, h);
// Execution order: f → g → h
// f(input) → g(fResult) → h(gResult)
```

## Error handling

If any function in the chain rejects, the composed function rejects with that error. Remaining functions are not executed.

```ts
const fn = compose(
  async (n: number) => n * 2,
  async () => { throw new Error("fail"); },
);

try {
  await fn(5).promise;
} catch (error) {
  console.log("Compose failed:", error);
}
```

## Cancellation

All functions share a single `CancellableToken`. Calling `cancel()` on the handle signals cancellation between steps.

```ts
const fn = seq(
  async (n: number, token) => { await token.sleep(5000); return n + 1; },
  async (n: number) => n * 2,
);

const handle = fn(5);
setTimeout(() => handle.cancel("User cancelled"), 100);

try {
  await handle.promise;
} catch (error) {
  if (error instanceof CancelError) {
    console.log("Compose was cancelled");
  }
}
```

## TypeScript tips

For up to 4 functions, `compose` and `seq` provide typed overloads so the input/output types chain correctly.

```ts
const fn = compose(
  async (s: string) => s.length,    // string → number
  async (s: string) => s.toUpperCase(), // string → string
);

const handle = fn("hello"); // CancellableHandle<number>
```

## Related APIs

- [`waterfall`](/reference/control-flow/waterfall/) chains tasks with result passing.
- [`series`](/reference/control-flow/series/) runs tasks sequentially.
- [`cancellable`](/reference/cancellable/cancellable/) creates cancellable handles.
- [`asyncify`](/reference/utils/asyncify/) wraps sync functions for async pipelines.
