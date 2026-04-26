export default {
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
  build: {
    outDir: ".acta/dist",
    cacheDir: ".acta/cache",
  },
} as const;
