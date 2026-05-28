import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";

const isPagesBuild = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  site: isPagesBuild ? "https://jentix.github.io" : "http://localhost:4321",
  base: isPagesBuild ? "/adr-book" : undefined,
  output: "static",
  i18n: {
    defaultLocale: "en",
    locales: ["en", "ru"],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [react()],
  vite: {
    resolve: {
      alias: {
        "@lib": fileURLToPath(new URL("./src/lib", import.meta.url)),
      },
    },
  },
});
