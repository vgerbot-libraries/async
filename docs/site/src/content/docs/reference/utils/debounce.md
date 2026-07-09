---
title: debounce
description: Create a debounced version of an async function.
---

`debounce` creates a debounced function that delays execution until after a specified wait time has elapsed since the last call. It wraps `DebounceTaskExecutor` for function-level use.

> **Best for function-level debouncing**
> Use `debounce` when you want to debounce a standalone function rather than managing an executor.

## Import

Root package:

```ts
import { debounce } from "@vgerbot/async";
```

Module subpath:

```ts
import { debounce } from "@vgerbot/async/utils";
```

Leaf subpath:

```ts
import { debounce } from "@vgerbot/async/utils/debounce";
```

## Quick example

```ts
import { debounce } from "@vgerbot/async";

const search = debounce(
  async (query: string) => {
    const res = await fetch(`/api/search?q=${query}`);
    return res.json();
  },
  300, // 300ms wait
);

// Rapid calls — only the last one executes
search("he");
search("hel");
search("hell");
search("hello");

// After 300ms of no calls, search("hello") executes
```

## When to use `debounce`

- **Search-as-you-type**: Debounce search requests while the user is typing.
- **Autosave**: Debounce save operations while content is changing.
- **Resize handlers**: Debounce layout recalculations.
- **Form validation**: Debounce validation checks as the user edits.

## API

```ts
function debounce<T, Args extends unknown[] = unknown[]>(
  fn: (...args: Args) => Promise<T>,
  wait: number,
  options?: DebounceOptions,
): DebouncedFunction<T, Args>;
```

### `DebouncedFunction`

```ts
interface DebouncedFunction<T, Args extends unknown[] = unknown[]> {
  (...args: Args): Promise<T>;
  cancel(): void;
  flush(): void;
  pending(): boolean;
}
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `fn` | `(...args: Args) => Promise<T>` | — | Async function to debounce. |
| `wait` | `number` | — | Milliseconds to wait before executing. |
| `options` | `DebounceOptions` | `undefined` | Debounce configuration. |

### `DebounceOptions`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `leading` | `boolean` | `false` | Execute on the leading edge (first call). |
| `trailing` | `boolean` | `true` | Execute on the trailing edge (after wait). |
| `maxWait` | `number` | `undefined` | Maximum wait time before forced execution. |

### Return value

Returns a debounced function with `cancel()`, `flush()`, and `pending()` methods.

| Method | Description |
| --- | --- | --- |
| `cancel()` | Cancels the pending execution. |
| `flush()` | Immediately executes the pending task. |
| `pending()` | Returns `true` if a task is waiting to execute. |

## Execution model

`debounce` creates a `DebounceTaskExecutor` internally. Each call to the debounced function submits a new task to the executor, which replaces any pending task.

```ts
const save = debounce(async (data: string) => {
  await fetch("/api/save", { method: "POST", body: data });
}, 500);

// User types rapidly
save("draft 1");
save("draft 2");
save("draft 3");

// Only "draft 3" is saved after 500ms of inactivity
```

### Leading edge

```ts
const log = debounce(
  async (msg: string) => console.log(msg),
  1000,
  { leading: true, trailing: false },
);

log("first");  // Executes immediately
log("second"); // Dropped
log("third");  // Dropped

// Only "first" is logged
```

## Cancellation

```ts
const search = debounce(mySearchFn, 300);

search("query");
search.cancel(); // Pending search is cancelled

if (search.pending()) {
  search.flush(); // Execute immediately
}
```

## TypeScript tips

`debounce` preserves the argument types of the original function.

```ts
const fn = (a: number, b: string): Promise<boolean> => { /* ... */ };
const debounced = debounce(fn, 300);

const result = await debounced(42, "hello"); // Promise<boolean>
```

## Related APIs

- [`DebounceTaskExecutor`](/reference/executors/debounce-task-executor/) — the executor backing this function.
- [`throttle`](/reference/utils/throttle/) — function-level throttle.
- [`ThrottleTaskExecutor`](/reference/executors/throttle-task-executor/) — throttle executor.
- [`once`](/reference/utils/once/) — execute a function only once.
