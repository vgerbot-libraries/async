# Contributing Guide

Thank you for your interest in contributing!

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally.
3. **Install dependencies**:

    ```bash
    pnpm install
    ```

## Development Workflow

- **Start dev server**: `pnpm dev`
- **Run tests**: `pnpm test`
- **Lint code**: `pnpm lint`
- **Format code**: `pnpm format`

## Changesets

We use [Changesets](https://github.com/changesets/changesets) for versioning.
If your change affects a published package, please add a changeset:

```bash
pnpm changeset
```

Follow the prompts to select packages and bump types (major/minor/patch).

## Pull Request Process

1. Ensure all tests pass.
2. Ensure linting passes.
3. Open a Pull Request against the `main` branch.
