# AGENTS.md — Acta Repository Guide

Reference for agents and contributors working in this repository. Covers layout, document model, verification workflow, and how to create specs/ADRs for completed work.

---

## Repository layout

```
acta/
├── apps/
│   └── web/                    # Future static Astro viewer (Phase 3, not yet implemented)
├── packages/
│   ├── core/                   # @acta/core — canonical document pipeline (parser, validator, graph, artifacts, search)
│   │   └── src/
│   │       ├── schema.ts       # Zod schemas, document types, link types
│   │       ├── config.ts       # defineConfig, resolveConfig, loadConfig
│   │       ├── parse.ts        # Markdown + frontmatter parser
│   │       ├── scanner.ts      # File system scanner (fast-glob)
│   │       ├── project.ts      # loadProject, validateLoadedProject
│   │       ├── validation.ts   # Validation rules engine, ValidationResult
│   │       ├── graph.ts        # buildGraph, deriveBacklinks
│   │       ├── artifacts.ts    # buildArtifacts — writes .acta/dist/*.json
│   │       └── index.ts        # Public API re-exports
│   ├── cli/                    # @acta/cli — thin CLI layer over core (bin: acta)
│   │   └── src/
│   │       ├── index.ts        # citty runMain entrypoint, subcommand registry
│   │       ├── context.ts      # Config resolution helper
│   │       ├── output.ts       # Terminal formatters, exit helpers
│   │       ├── slug.ts         # title → kebab-case slug
│   │       ├── id.ts           # Auto-allocate next document ID
│   │       ├── template.ts     # Template rendering with placeholder substitution
│   │       ├── commands/       # One file per command (init, new, list, show, validate, graph, build, renumber)
│   │       └── test/           # Vitest tests (fixture helper + per-command test files)
│   ├── renderer/               # @acta/renderer — Markdown-to-HTML helpers (Phase 3, scaffolded)
│   └── mcp-server/             # Future MCP server (Phase 5, not yet created)
├── docs/
│   ├── decisions/              # ADR documents (ADR-NNNN-<slug>.md)
│   ├── specs/                  # Spec documents (SPEC-NNNN-<slug>.md)
│   └── templates/              # adr.md and spec.md templates used by `acta new`
├── .acta/                      # Build artifacts (gitignored)
│   ├── dist/                   # documents.json, graph.json, search-index.json, validation.json, manifest.json
│   └── cache/                  # content-cache.json
├── acta.config.ts              # Acta configuration for this repository
├── package.json                # Root workspace scripts and engines declaration
├── pnpm-workspace.yaml         # pnpm workspace package paths
├── turbo.json                  # Turborepo task pipeline
├── biome.json                  # Biome lint/format config
├── tsconfig.base.json          # Shared TypeScript base config (NodeNext ESM, strict)
├── MVP_PLAN_UPDATED.md         # Canonical product roadmap — read before major changes
├── AGENTS.md                   # This file
└── README.md                   # Project overview
```

---

## Document model quick reference

### Kinds

| Kind | Prefix | Dir |
|---|---|---|
| `adr` | `ADR` | `docs/decisions/` |
| `spec` | `SPEC` | `docs/specs/` |

### ID format

`<PREFIX>-<NNNN>` where `NNNN` is zero-padded to `config.ids.width` (default: 4).
Filename must start with the id and include a slug: `ADR-0001-use-markdown.md`.

### Lifecycle statuses

**ADR:** `proposed` → `accepted` | `rejected` | `deprecated` | `superseded`

**Spec:** `draft` → `active` | `paused` | `implemented` | `obsolete`

### Link types

| Key | Meaning | Internal / External |
|---|---|---|
| `related` | Loosely related documents | internal |
| `supersedes` | This document supersedes the target (must be mirrored by `replacedBy`) | internal |
| `replacedBy` | This document is replaced by the target | internal |
| `decidedBy` | This spec was decided by an ADR | internal |
| `dependsOn` | This document depends on the target | internal |
| `validates` | This spec validates an ADR decision | internal |
| `references` | External URLs only | external (must be valid http/https) |

---

## Workflow: verifying completed tasks

Run these checks in order. All must pass before marking a phase complete.

```bash
# 1. Install dependencies (after pulling or adding packages)
pnpm install

# 2. Lint — Biome checks style + correctness across all packages
pnpm lint

# 3. Type-check all packages
pnpm typecheck

# 4. Run all tests
pnpm test

# 5. Build all packages
pnpm build

# 6. Validate docs — single source of truth for document consistency
pnpm exec acta validate

# 7. Build artifacts — inspect manifest for error/warning counts
pnpm exec acta build
# Output written to .acta/dist/
# Check .acta/dist/manifest.json for errorCount and warningCount
```

### Per-package commands

```bash
# Run only for a specific package (faster iteration)
pnpm --filter @acta/core test
pnpm --filter @acta/cli test
pnpm --filter @acta/cli build
pnpm --filter @acta/cli typecheck
```

### What each check validates

- `pnpm lint` — no unused imports, no forbidden patterns, consistent style
- `pnpm typecheck` — TypeScript strict mode, no type errors
- `pnpm test` — unit + integration tests with Vitest (fixture-based, temp dirs)
- `pnpm build` — all packages compile to ESM bundles via tsup
- `acta validate` — frontmatter schema, ID uniqueness, broken links, supersession cycles, required sections
- `acta build` — full artifact pipeline; errorCount in manifest must be 0 for a clean build

### Negative test (confirming validation catches errors)

Temporarily break a link to confirm exit code 1:

```bash
# Edit a doc to reference a nonexistent ID, then:
pnpm exec acta validate
# Must exit 1 with error output. Revert the change after confirming.
```

---

## Workflow: creating specs/ADRs for completed work

After completing a phase or significant feature, document it using the CLI.

### Step 1 — Create the document

```bash
# For an architectural decision:
pnpm exec acta new adr "Decision title"
# → Creates docs/decisions/ADR-NNNN-decision-title.md

# For a feature or system spec:
pnpm exec acta new spec "Feature name"
# → Creates docs/specs/SPEC-NNNN-feature-name.md
```

### Step 2 — Fill frontmatter

Open the created file and update:

```yaml
status: accepted          # or: proposed, rejected, deprecated, superseded (ADR)
                          # or: active, draft, paused, implemented, obsolete (spec)
tags: [tag1, tag2]
component: [acta-core]    # which package(s) this touches
owners: [YourName]
summary: One-sentence description.
links:
  decidedBy: [ADR-NNNN]   # which ADR decided this (spec only)
  dependsOn: [ADR-NNNN]   # prior decisions this builds on
  validates: [ADR-NNNN]   # which ADR this spec implements/validates
  related: [SPEC-NNNN]    # loosely related docs
```

### Step 3 — Fill required sections

**ADR** must have: `# Context`, `# Decision`, `# Consequences`, `# Alternatives`

**Spec** must have: `# Summary`, `# Goals`, `# Requirements`

### Step 4 — Validate

```bash
pnpm exec acta validate
# Must exit 0 with no errors
```

### Step 5 — Inspect with CLI tools

```bash
pnpm exec acta show ADR-NNNN          # verify metadata, links, backlinks
pnpm exec acta graph --format mermaid # visual sanity check
```

---

## Reference: where to look

| Topic | Location |
|---|---|
| Product roadmap | `MVP_PLAN_UPDATED.md` |
| Architecture decisions | `docs/decisions/` |
| Feature specs | `docs/specs/` |
| Document templates | `docs/templates/` |
| Core public API | `packages/core/src/index.ts` |
| CLI command implementations | `packages/cli/src/commands/` |
| CLI tests | `packages/cli/src/test/` |
| Build artifacts (gitignored) | `.acta/dist/` |
| Build manifest | `.acta/dist/manifest.json` |
