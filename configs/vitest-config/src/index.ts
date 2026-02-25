import path from "node:path";
import type { BaseCoverageOptions, CoverageOptions, InlineConfig } from "vitest/node";

export const sharedConfig: {
    test: InlineConfig;
} = {
    test: {
        globals: true,
        coverage: {
            provider: "istanbul" as const,
            reportsDirectory: path.join(process.cwd(), "report"),
            reporter: [
                ["json", { file: "coverage.json" }],
                ["cobertura", { file: "cobertura-coverage.xml" }],
            ] as BaseCoverageOptions["reporter"],
            enabled: true,
        } satisfies CoverageOptions<"istanbul">,
    } satisfies InlineConfig,
};

// Re-export specific configs for backwards compatibility
// Re-export specific configs for backwards compatibility
export { baseConfig } from "./configs/base-config";
export { uiConfig } from "./configs/ui-config";
