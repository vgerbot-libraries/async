// @ts-check

import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
    integrations: [
        starlight({
            title: "@vgerbot/async",
            components: {
                SocialIcons: "./src/components/SocialIcons.astro",
            },
            social: [
                {
                    icon: "github",
                    label: "GitHub",
                    href: "https://github.com/vgerbot-libraries/async",
                },
            ],
            sidebar: [
                {
                    label: "Getting Started",
                    items: [
                        // Each item here is one entry in the navigation menu.
                        { label: "Installation", slug: "getting-started/installation" },
                        { label: "Choosing APIs", slug: "guides/choosing-apis" },
                    ],
                },
                {
                    label: "Guides",
                    items: [
                        { label: "Cancellation and Timeouts", slug: "guides/cancellation-and-timeouts" },
                        { label: "Concurrency Patterns", slug: "guides/concurrency-patterns" },
                    ],
                },
                {
                    label: "Reference",
                    items: [
                        { label: "Cancellable", slug: "reference/cancellable" },
                        { label: "Collections", slug: "reference/collections" },
                        {
                            label: "Control Flow",
                            items: [
                                { label: "Overview", slug: "reference/control-flow" },
                                { label: "auto", slug: "reference/control-flow/auto" },
                                { label: "queue", slug: "reference/control-flow/queue" },
                            ],
                        },
                        {
                            label: "Executors",
                            items: [
                                { label: "Overview", slug: "reference/executors" },
                                { label: "PoolTaskExecutor", slug: "reference/executors/pool-task-executor" },
                            ],
                        },
                        {
                            label: "Utils",
                            items: [
                                { label: "Overview", slug: "reference/utils" },
                                { label: "memoize", slug: "reference/utils/memoize" },
                            ],
                        },
                    ],
                },
            ],
        }),
    ],
});
