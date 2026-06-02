import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";

const isPagesBuild = process.env.GITHUB_PAGES === "true";

// `acta site` drives the build from outside the monorepo and injects these.
const siteUrl =
  process.env.ACTA_SITE ?? (isPagesBuild ? "https://jentix.github.io" : "http://localhost:4321");
const base = process.env.ACTA_BASE ?? (isPagesBuild ? "/acta" : undefined);
const outDir = process.env.ACTA_SITE_OUT || undefined;

export default defineConfig({
  site: siteUrl,
  base,
  ...(outDir ? { outDir } : {}),
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
