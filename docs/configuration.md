# Acta Configuration

Acta loads `acta.config.ts` from the current working directory by default. Use `defineConfig` from `@acta/core` for type-safe config authoring.

## Minimal Config

```ts
import { defineConfig } from "@acta/core";

export default defineConfig({});
```

With no fields set, Acta uses the default directory layout and validation settings.

## Full Config

```ts
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
    owners: ["Boris"],
  },
  build: {
    outDir: ".acta/dist",
    cacheDir: ".acta/cache",
  },
});
```

## `docs`

| Field | Default | Description |
|---|---|---|
| `docs.adrDir` | `docs/decisions` | Directory scanned for ADR Markdown files. |
| `docs.specDir` | `docs/specs` | Directory scanned for spec Markdown files. |
| `docs.templatesDir` | `docs/templates` | Directory used by `acta new` for `adr.md` and `spec.md`. |

Relative paths are resolved from the directory that contains `acta.config.ts`.

## `ids`

| Field | Default | Description |
|---|---|---|
| `ids.adrPrefix` | `ADR` | Required prefix for ADR IDs. |
| `ids.specPrefix` | `SPEC` | Required prefix for spec IDs. |
| `ids.width` | `4` | Width of the zero-padded numeric suffix. |

With the defaults, Acta creates IDs such as `ADR-0001` and `SPEC-0001`.

## `validation`

| Field | Default | Description |
|---|---|---|
| `validation.draftMaxAgeDays` | `30` | Reserved for draft-age validation. |
| `validation.requiredSections.adr` | `["Context", "Decision", "Consequences"]` | ADR section headings expected by validation. Missing sections are warnings. |
| `validation.requiredSections.spec` | `["Summary", "Goals", "Requirements"]` | Spec section headings expected by validation. Missing sections are warnings. |
| `validation.orphanDocuments` | `warning` | Severity for documents with no internal links or backlinks. |
| `validation.asymmetricSupersedes` | `error` | Severity when `replacedBy` is not mirrored by `supersedes`. |
| `validation.owners` | unset | Optional allowlist for frontmatter `owners`. Unknown owners become warnings. |

Severity fields accept:

```txt
off, warning, error
```

## `build`

| Field | Default | Description |
|---|---|---|
| `build.outDir` | `.acta/dist` | Directory for generated artifacts. |
| `build.cacheDir` | `.acta/cache` | Directory for generated cache files. |

`.acta/` is generated state and should be ignored by Git.

## Frontmatter Model

Every document must contain YAML frontmatter:

```yaml
id: ADR-0001
kind: adr
title: Use PostgreSQL
status: proposed
date: 2026-05-24T10:00:00.000Z
tags: [database]
component: [storage]
owners: [Boris]
summary: Choose PostgreSQL as the primary relational database.
links:
  related: []
  supersedes: []
  replacedBy: []
  decidedBy: []
  dependsOn: []
  validates: []
  references: []
```

Required fields:

| Field | Description |
|---|---|
| `id` | Stable document ID matching the configured prefix. |
| `kind` | `adr` or `spec`. |
| `title` | Human-readable title. |
| `status` | Valid lifecycle status for the document kind. |
| `date` | ISO 8601 datetime with timezone offset. |

Optional fields:

| Field | Description |
|---|---|
| `updated` | ISO 8601 datetime with timezone offset. |
| `tags` | Search and filtering tags. |
| `component` | Affected packages, systems or product areas. |
| `owners` | Responsible people or teams. |
| `summary` | Short description used by CLI and viewer. |
| `links` | Typed internal and external relationships. |

## Statuses

ADR statuses:

```txt
proposed, accepted, rejected, deprecated, superseded
```

Spec statuses:

```txt
draft, active, paused, implemented, obsolete
```

## Link Types

| Link | Target | Meaning |
|---|---|---|
| `related` | Internal IDs | Loosely related documents. |
| `supersedes` | Internal IDs | This document replaces the target. |
| `replacedBy` | Internal IDs | This document is replaced by the target. |
| `decidedBy` | Internal IDs | This spec was decided by an ADR. |
| `dependsOn` | Internal IDs | This document depends on another document. |
| `validates` | Internal IDs | This spec validates an ADR decision. |
| `references` | URLs | External `http` or `https` references. |
