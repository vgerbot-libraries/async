---
title: memoize
description: Cache async function results while preserving cancellable handles and task options.
---

`memoize` creates a cached async function. Calls with the same cache key return a `CancellableHandle` that resolves to the cached value after the first successful execution stores it.

> **Best for cached async lookups**
> Use `memoize` for id-based fetches, configuration lookups, permission checks, or other async reads where repeated calls should reuse prior results.

## Import

Root package:

```ts
import { memoize } from "@vgerbot/async";
```

Module subpath:

```ts
import { memoize } from "@vgerbot/async/utils";
```

Leaf subpath:

```ts
import { memoize } from "@vgerbot/async/utils/memoize";
```

## Quick example

```ts
import { memoize } from "@vgerbot/async";

const getUser = memoize(async (id: number, token) => {
  const response = await token.wrap(fetch(`/api/users/${id}`));
  return response.json() as Promise<{ id: number; name: string }>;
});

const first = getUser(1);
const user = await first.promise;

const second = getUser(1);
const cachedUser = await second.promise;

console.log(user === cachedUser);
```

## When to use `memoize`

- **Repeated reads**: The same arguments should reuse a previous result.
- **Cancellable callers**: Each call should still return a `CancellableHandle`.
- **Simple cache control**: Consumers can inspect or clear `memoized.cache`.
- **Custom keys**: Multiple arguments need a stable custom cache key.

## API

```ts
function memoize<TArgs extends unknown[], TResult>(
  fn: (...args: [...TArgs, CancellableToken]) => Promise<TResult>,
  options?: MemoizeOptions,
): ((...args: TArgs) => CancellableHandle<TResult>) & {
  cache: Map<string, TResult>;
};
```

### Parameters

#### `fn`

The async function to cache. `memoize` passes the original call arguments followed by a `CancellableToken`.

```ts
const getUser = memoize(async (id: number, token) => {
  await token.sleep(100);
  return { id };
});
```

#### `options`

`MemoizeOptions` extends shared `CancellableOptions` and adds `resolver`.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `resolver` | `(...args: unknown[]) => string` | `String(args[0])` | Creates the cache key for a call. |
| `name` | `string` | `undefined` | Optional name passed to generated cancellable handles. |
| `signal` | `AbortSignal` | `undefined` | External signal linked to each generated handle. |
| `timeout` | `number` | `undefined` | Timeout applied to each generated handle. |
| `fallback` | value or function | `undefined` | Fallback used when a generated handle rejects. |
| `retry` | `RetryOptions` | `undefined` | Retry configuration for uncached executions. |
| `onCancel` | function | `undefined` | Called when a generated handle is cancelled. |
| `onRetry` | function | `undefined` | Called before a retry attempt. |

### Return value

`memoize` returns a function with the same public arguments as `fn`, excluding the injected `CancellableToken`. The returned function also has a `cache` map.

```ts
const getUser = memoize(fetchUser);

const handle = getUser(1);
const user = await handle.promise;

getUser.cache.clear();
```

## Cache behavior

The default resolver uses the first argument converted to a string.

```ts
const byId = memoize(async (id: number, token) => {
  await token.sleep(100);
  return { id };
});

await byId(1).promise;
console.log(byId.cache.has("1"));
```

Use a custom resolver when multiple arguments define identity.

```ts
const getRepo = memoize(
  async (owner: string, repo: string, token) => {
    const response = await token.wrap(fetch(`/api/repos/${owner}/${repo}`));
    return response.json();
  },
  {
    resolver: (owner, repo) => `${owner}/${repo}`,
  },
);
```

Only successful uncached executions are stored. If `fn` rejects, no value is added to `cache` unless a shared cancellable `fallback` resolves a value.

## Cancellation

Every call returns a `CancellableHandle`. Cancelling an uncached call cancels that execution. Cancelling a cached call cancels only the handle returned for that cached value.

```ts
const getSlowValue = memoize(async (id: number, token) => {
  await token.sleep(5_000);
  return id;
});

const handle = getSlowValue(1);
handle.cancel("No longer needed");

await handle.promise;
```

## Error handling

Uncached execution errors reject the returned handle and do not populate the cache.

```ts
const getConfig = memoize(async (_name: string) => {
  throw new Error("Config unavailable");
});

await getConfig("app").promise.catch(() => undefined);
console.log(getConfig.cache.has("app")); // false
```

## TypeScript tips

`memoize` infers the public arguments from all parameters before the trailing `CancellableToken`.

```ts
const loadRange = memoize(
  async (start: number, end: number, token) => {
    await token.sleep(100);
    return Array.from({ length: end - start }, (_, index) => start + index);
  },
  {
    resolver: (start, end) => `${start}:${end}`,
  },
);

const values = await loadRange(10, 15).promise;
```

## Related APIs

- [Utils](/reference/utils/) lists other function wrappers.
- [Cancellable](/reference/cancellable/) explains `CancellableHandle` and `CancellableToken`.
- [`queue`](/reference/control-flow/queue/) is better when cached work should be processed through a shared worker queue.
