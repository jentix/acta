import { defineConfig } from "@acta/core";

export default defineConfig({
  docs: {
    adrDir: "docs/decisions",
    specDir: "docs/specs",
    templatesDir: "docs/templates",
  },
  ids: {
    adrPrefix: "ADR",
    specPrefix: "SPEC",
    width: 4,
  },
  validation: {
    draftMaxAgeDays: 30,
    requiredSections: {
      adr: ["Context", "Decision", "Consequences"],
      spec: ["Summary", "Goals", "Requirements"],
    },
    orphanDocuments: "warning",
    asymmetricSupersedes: "error",
  },
  build: {
    outDir: ".acta/dist",
    cacheDir: ".acta/cache",
  },
});
