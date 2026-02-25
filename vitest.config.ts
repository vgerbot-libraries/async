import path from "node:path";
import { sharedConfig } from "@repo/vitest-config";
import { defineConfig } from "vitest/config";

const current_dir = import.meta.dirname;

export default defineConfig({
    test: {
        ...sharedConfig.test,
        projects: [
            {
                root: path.resolve(current_dir, "packages"),
                test: {
                    ...sharedConfig.test,
                    // Project-specific configuration for packages
                    // ...
                },
            },
            {
                root: path.resolve(current_dir, "apps"),
                test: {
                    ...sharedConfig.test,
                    // Project-specific configuration for apps
                    environment: "jsdom",
                },
            },
        ],
    },
});
