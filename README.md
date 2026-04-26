# Acta

Acta is a TypeScript-first docs-as-code tool for managing ADR and spec documents in a Git repository.

Phase 0 is intentionally limited to project bootstrap:

- pnpm + Turborepo workspace
- TypeScript package skeletons
- Biome formatting and linting
- Vitest smoke tests
- dogfooding ADR/spec documents and templates

The parser, validator, graph builder, search index, CLI commands, and Astro viewer are planned for later phases.

## Workspace

```txt
apps/web          Future static web viewer
packages/core     Future schemas, parser, validator, graph, and artifacts
packages/cli      Future CLI package with the acta binary
packages/renderer Future Markdown and terminal/html rendering helpers
docs/             Dogfooding ADR/spec documents and templates
```

## Commands

```sh
pnpm install
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
pnpm test
```
