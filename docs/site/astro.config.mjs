// @ts-check

import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import { generateSidebar } from "./src/utils/generate-sidebar.mjs";

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
            sidebar: generateSidebar(),
        }),
    ],
});
