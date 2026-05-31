# @acta-dev/core

Canonical document pipeline for [Acta](https://github.com/jentix/acta) — the docs-as-code tool for **ADR** and **spec** documents.

`@acta-dev/core` powers the `@acta-dev/cli` binary, CI validation, generated JSON artifacts and the web viewer, so validation rules never drift between tools.

## What's inside

- Zod schemas, document types and link types
- Markdown + frontmatter parser
- File-system scanner and project loader
- Validation rules engine
- Graph + backlink derivation, dependency ordering
- Search index and `.acta/dist` artifact builder

## Install

```sh
npm install @acta-dev/core
```

## Usage

Most users interact via [`@acta-dev/cli`](https://www.npmjs.com/package/@acta-dev/cli). Direct API use is for integrations and the typed config file:

```ts
// acta.config.ts
import { defineConfig } from "@acta-dev/core";

export default defineConfig({
  docs: {
    adrDir: "docs/decisions",
    specDir: "docs/specs",
    templatesDir: "docs/templates",
  },
});
```

## License

MIT
