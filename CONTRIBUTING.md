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
3. Add a changeset (see above) if your change affects a published package.
4. Open a Pull Request against the `master` branch.

## Release Process

This project uses [Changesets](https://github.com/changesets/changesets) + GitHub Actions for automated versioning and publishing. The full flow is as follows:

### 1. Add a Changeset

When your change affects a published package (e.g. `@vgerbot/async`), add a changeset before opening a PR:

```bash
pnpm changeset
```

This creates a file under `.changeset/` describing the change and the desired version bump (`patch` / `minor` / `major`). The CI `Changeset Check` job will fail if no changeset is found.

### 2. CI Checks (on PR)

Every PR to `master` triggers the [CI workflow](.github/workflows/ci.yml), which runs:

- **Test & Lint** — type-check, lint, unit tests, and build (Node 22 & 24)
- **Build Matrix** — cross-platform build verification (Ubuntu / Windows / macOS, Node 20)
- **Changeset Check** — verifies a changeset exists
- **Security Audit** — `pnpm audit` for known vulnerabilities

All jobs must pass before the PR can be merged.

### 3. Version PR (auto)

When a PR is merged to `master`, the [Release workflow](.github/workflows/release.yml) runs `changesets/action`. If there are pending changesets, it automatically:

1. Consumes the changeset files
2. Bumps package versions accordingly
3. Updates `CHANGELOG.md`
4. Opens a **"Version Packages" PR** with title `ci(changesets): version packages`

### 4. Publish to npm (auto)

Merge the **"Version Packages" PR** to trigger the Release workflow again. This time, with no pending changesets, `changesets/action` will:

1. Run `pnpm changeset:publish`
2. Publish the new version(s) to [npm](https://www.npmjs.com/package/@vgerbot/async)

> **Prerequisite**: The `NPM_TOKEN` secret must be configured in the GitHub repository settings (Settings → Secrets and variables → Actions).

### 5. Documentation (auto)

Pushing to `master` or a `v*` tag triggers the [Deploy Docs workflow](.github/workflows/deploy-docs.yml), which builds the API reference (TypeDoc) and the documentation site (Astro), then deploys them to GitHub Pages.

### Flow Diagram

```text
Developer
  │
  ├─ pnpm changeset  →  .changeset/*.md
  │
  ├─ Open PR to master
  │     │
  │     └─ CI: test / lint / build / changeset-check / security
  │
  ├─ Merge PR
  │     │
  │     └─ Release workflow
  │           │
  │           ├─ Has pending changesets? → Open "Version Packages" PR
  │           │
  │           └─ No pending changesets?  → pnpm changeset:publish → npm
  │
  └─ Merge "Version Packages" PR
        │
        └─ Release workflow → publish to npm
              │
              └─ Deploy Docs workflow → GitHub Pages
```

### Manual Release (fallback)

If automated publishing fails, you can publish locally:

```bash
pnpm changeset:version    # bump versions + update changelogs
pnpm build                # build dist
pnpm changeset:publish    # publish to npm (requires npm login)
```
