# Acta

Acta is a TypeScript-first docs-as-code tool for managing ADR and spec documents in a Git repository.

Phase 1 implements the core data pipeline in `@acta/core`:

- typed Zod schemas for ADR and spec frontmatter
- config loading through `defineConfig`
- Markdown + YAML frontmatter parsing
- repository scanning for `docs/decisions` and `docs/specs`
- normalized document models with typed links and backlinks
- validation for IDs, links, sections, supersession and references
- UI-agnostic graph generation
- JSON artifacts for CLI, web, CI and future MCP consumers

CLI commands and the static web viewer are still planned for later phases.

## Workspace

```txt
apps/web          Future static web viewer
packages/core     Schemas, parser, validator, graph, search index and artifacts
packages/cli      Future CLI package with the acta binary
packages/renderer Future Markdown and terminal/html rendering helpers
docs/             Dogfooding ADR/spec documents and templates
```

## Configuration

`acta.config.ts` uses the core config helper:

```ts
import { defineConfig } from "@acta/core/config";

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
  build: {
    outDir: ".acta/dist",
    cacheDir: ".acta/cache",
  },
});
```

## Core API

`@acta/core` exposes library APIs for future CLI and web integrations:

- `loadConfig`
- `loadProject`
- `validateProject`
- `buildArtifacts`
- document, config, validation, graph and artifact types

## Artifacts

`buildArtifacts` writes generated state under `.acta/`, which is ignored by Git:

```txt
.acta/
├── cache/
│   └── content-cache.json
└── dist/
    ├── documents.json
    ├── graph.json
    ├── manifest.json
    ├── search-index.json
    └── validation.json
```

These files are the contract that later CLI, web, CI and MCP layers should consume.

## Commands

```sh
pnpm install
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
pnpm test
```
