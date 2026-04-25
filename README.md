# ADR Book

ADR Book is a docs-as-code toolkit for architecture decisions and living technical specifications stored in a repository as Markdown documents with structured metadata.

## Packages

- `packages/core` - document model, parsing, indexing, validation, graph building
- `packages/renderer` - Markdown rendering and search text extraction
- `packages/cli` - `adr-book` command line interface
- `apps/web` - static React viewer for generated artifacts

## Quick start

```bash
pnpm install
pnpm build
pnpm test
pnpm cli validate
pnpm cli build
pnpm --filter @adr-book/web dev
```
