import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@adr-book/core": path.resolve(__dirname, "../core/src/index.ts"),
      "@adr-book/renderer": path.resolve(__dirname, "../renderer/src/index.ts")
    }
  }
});
