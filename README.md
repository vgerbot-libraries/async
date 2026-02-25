# TypeScript Library Boilerplate

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Turborepo](https://img.shields.io/badge/Turborepo-1.10-red?style=for-the-badge&logo=turborepo)
![pnpm](https://img.shields.io/badge/pnpm-8.0-orange?style=for-the-badge&logo=pnpm)
![Biome](https://img.shields.io/badge/Biome-1.0-yellow?style=for-the-badge&logo=biome)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

</div>

## 🚀 Why this Boilerplate?

Starting a modern TypeScript project can be overwhelming with the amount of tooling choices available. This boilerplate is opinionated to provide the **best developer experience (DX)** and **performance** capabilities out of the box.

- **Speed First**: Built on [Turborepo](https://turbo.build/) and [pnpm](https://pnpm.io/) for lightning-fast incremental builds and efficient package management.
- **Modern Tooling**: Replaces ESLint and Prettier with [Biome](https://biomejs.dev/) — a single, rust-based tool that is 35x faster.
- **Monorepo Ready**: Structure your library, documentation, and test apps in a single repository with shared configurations.
- **Type Safe**: Strict TypeScript configuration enabled by default across all packages.
- **Automated workflows**: Integrated Changesets for seamless versioning and publishing.

---

## 📦 Features

- **Monorepo Architecture**: Efficient build orchestration with Turborepo.
- **Strict TypeScript**: Shared `tsconfig` bases for consistent type checking.
- **Code Quality**: Fast linting and formatting with Biome.
- **Testing**: Vitest configured for unit and integration testing.
- **Versioning**: Automated changelogs and release management via Changesets.
- **Development App**: A SolidJS playground to test your library interactively.

## 🛠️ Project Structure

```bash
.
├── apps/
│   └── dev/                    # 🟢 Playground app (SolidJS) for testing your library in a real browser environment
├── packages/
│   └── core/                   # 📦 Your main library code lives here
├── configs/                    # ⚙️ Shared configurations (DRY principle)
│   ├── biome-config/           # Shared linting/formatting rules
│   ├── typescript-config/      # Base tsconfig files
│   ├── tailwind-config/        # Shared UI styles (if needed)
│   └── vitest-config/          # Shared test setup
```

## ⚡ Getting Started

### Use this Template

You can start by clicking **"Use this template"** on GitHub, or use `degit` to scaffold it locally:

```bash
npx degit <your-username>/ts-library-boilerplate my-awesome-library
cd my-awesome-library
```

### Installation

Install dependencies using pnpm (npm and yarn are not recommended for this setup):

```bash
# Install pnpm if you haven't already
npm install -g pnpm

# Install dependencies
pnpm install
```

### Development Workflow

1.  **Start the dev server**:
    This runs the `dev` app and watches your `core` package for changes.
    ```bash
    pnpm dev
    ```

2.  **Build packages**:
    Builds all packages in the correct dependency order.
    ```bash
    pnpm build
    ```

## 📜 Scripts

| Script | Command | Usage |
| :--- | :--- | :--- |
| **`pnpm dev`** | `turbo run dev` | Starts the playground app and library watchers. |
| **`pnpm build`** | `turbo run build` | Builds all apps and packages for production. |
| **`pnpm test`** | `turbo run test` | Runs all tests in the monorepo. |
| **`pnpm test:projects`** | `vitest run` | Runs tests specifically for packages (skipping apps if configured). |
| **`pnpm lint`** | `turbo run lint` | Lints code using Biome. |
| **`pnpm format`** | `biome check --write` | Formats code and fixes safe linting errors. |
| **`pnpm check-types`** | `turbo run check-types` | Validates TypeScript types across the entire repo. |
| **`pnpm changeset`** | `changeset` | Generate a changelog entry for your changes. |

## 🧩 Adding a New Package

1.  Create a folder in `packages/<new-package>`.
2.  Initialize a `package.json`:
    ```json
    {
      "name": "@repo/new-package",
      "type": "module",
      "scripts": {
        "build": "tsup src/index.ts --format esm,cjs --dts",
        "dev": "tsup src/index.ts --format esm,cjs --dts --watch"
      }
    }
    ```
3.  Add it to your `pnpm-workspace.yaml` (if not already covered by glob).
4.  Run `pnpm install` to link it.

## ❓ Troubleshooting

### pnpm Install Fails
- Ensure you are using the correct Node.js version (>=18).
- Try removing `node_modules` and `pnpm-lock.yaml` and reinstalling:
  ```bash
  rm -rf node_modules pnpm-lock.yaml && pnpm install
  ```

### Turbo Cache Issues
If your builds verify weirdly or seem stuck on old code, clear the turbo cache:
```bash
rm -rf node_modules/.cache/turbo
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) (if available) or follow these steps:

1.  Fork the repo.
2.  Create a branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes.
4.  Push to the branch.
5.  Open a PR.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
