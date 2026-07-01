---
title: noop
description: A no-op function that does nothing and returns undefined.
---

`noop` is a simple function that does nothing. It returns `undefined` and accepts no arguments. Useful as a default callback or placeholder.

> **Best for defaults and placeholders**
> Use `noop` when you need a function that does nothing, such as a default callback value.

## Import

Root package:

```ts
import { noop } from "@vgerbot/async";
```

Module subpath:

```ts
import { noop } from "@vgerbot/async/utils";
```

Leaf subpath:

```ts
import { noop } from "@vgerbot/async/utils/noop";
```

## Quick example

```ts
import { noop } from "@vgerbot/async";

const fn = condition ? realCallback : noop;
fn(); // Does nothing if condition was false
```

## When to use `noop`

- **Default callbacks**: Provide a no-op default for optional callback parameters.
- **Placeholder functions**: Use as a placeholder before the real function is assigned.
- **Testing**: Use as a mock or stub that does nothing.
- **Conditional execution**: Avoid `if` checks by using `noop` as the fallback.

## API

```ts
function noop(): void;
```

### Return value

Returns `undefined`.

## Usage patterns

### Default callback

```ts
function fetchData(onSuccess: () => void = noop) {
  // ...
  onSuccess();
}
```

### Conditional function

```ts
const log = debugMode ? console.log : noop;
log("This only logs in debug mode");
```

## Related APIs

- [`constant`](/reference/utils/constant/) — returns a constant value as a `CancellableHandle`.
- [`asyncify`](/reference/utils/asyncify/) — wraps sync functions.
- [`once`](/reference/utils/once/) — executes a function only once.
