# Acta

Acta is a TypeScript-first docs-as-code tool for managing ADR and spec documents in a Git repository.

Acta currently includes the core data pipeline, CLI, and static web viewer:

- typed Zod schemas for ADR and spec frontmatter
- config loading through `defineConfig`
- Markdown + YAML frontmatter parsing
- repository scanning for `docs/decisions` and `docs/specs`
- normalized document models with typed links and backlinks
- validation for IDs, links, sections, supersession and references
- UI-agnostic graph generation, dependency ordering and JSON artifacts
- CLI commands for init, new, list, show, validate, graph, build and renumber
- Astro static web viewer for browsing documents, graph relationships and validation results

The web viewer is read-only. Markdown remains the source of truth and the viewer loads documents through `@acta/core`.

## Workspace

```txt
apps/web          Astro static web viewer
packages/core     Schemas, parser, validator, graph, search index and artifacts
packages/cli      CLI package with the acta binary
packages/renderer Markdown-to-HTML rendering helpers
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
- dependency ordering helpers
- document, config, validation, graph, ordering and artifact types

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
    ├── ordering.json
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
pnpm dev
pnpm dev:web
pnpm --filter @acta/web build
pnpm --filter @acta/web preview
```

`pnpm dev` starts watch builds for the workspace packages and the Astro dev server. `pnpm dev:web` starts only the web viewer.

Git hooks are opt-in:

```sh
pnpm exec lefthook install
```
