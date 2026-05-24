import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";

export default defineConfig({
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
