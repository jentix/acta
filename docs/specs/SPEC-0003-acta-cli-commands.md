---
id: SPEC-0003
kind: spec
title: Acta CLI commands
status: active
date: 2026-05-01
tags: [cli, phase-2]
component: [acta-cli]
owners: [Boris]
summary: Defines the command surface, argument contracts, exit codes and output formats for the @acta/cli package in Phase 2.
links:
  related: [ADR-0004]
  decidedBy: [ADR-0004]
  dependsOn: [ADR-0003, SPEC-0002]
  validates: []
  references: []
---

# Summary

Phase 2 implements the `acta` CLI binary as a thin orchestration layer over `@acta/core`. This spec defines the complete command surface, argument contracts, output formats, and exit code semantics for the Phase 2 CLI.

# Goals

- Expose all document operations as composable terminal commands.
- Keep CLI logic minimal: parse args, call core, format output, set exit code.
- Support CI-friendly output modes (`--json`, `--ci`) for integration in pipelines.
- Enable dogfooding: Acta's own docs are authored and validated via the CLI.

# Requirements

## Commands

| Command | Purpose |
|---|---|
| `acta init` | Initialize docs structure and templates in a repo. Idempotent. Prompts before overwrite unless `--yes`. |
| `acta new adr <title>` | Create ADR from template with auto-allocated ID. |
| `acta new spec <title>` | Create spec from template with auto-allocated ID. |
| `acta list` | List documents with optional `--kind`, `--status`, `--tag`, `--json` filters. |
| `acta show <ID>` | Show document metadata, sections, links, backlinks. `--json` for machine output. |
| `acta validate` | Validate all documents. Exit 1 on errors. `--ci` writes `validation.json`. `--json` prints to stdout. |
| `acta graph` | Emit relationship graph as Mermaid (default) or JSON (`--format json`). |
| `acta build` | Build all artifacts to `.acta/dist/`. Exit 1 if validation errors. |
| `acta renumber <FROM> <TO>` | Rename a document ID, updating frontmatter, filename and all internal link references. `--dry-run` prints plan without writing. |

## Exit codes

- `0`: success
- `1`: validation error, build failure, or document operation failure
- `2`: CLI usage error (wrong args, unknown flags)

## ID allocation

`acta new` scans existing documents of the same kind, finds the maximum numeric suffix, and allocates `max + 1` padded to `config.ids.width` digits. Override via `--id <ID>` flag.

## Filename convention

Created files follow `<ID>-<slug>.md` where slug is the title lowercased and non-alphanumeric characters replaced with dashes.

## Template rendering

Templates are read from `config.docs.templatesDir`. Placeholders `id`, `title`, `date`, and `status` are replaced in frontmatter. Body sections remain unchanged.

## Renumber atomicity

`renumber` builds a full plan (identify target, affected docs) before writing any files. Writes affected docs first, then rewrites target frontmatter, then renames the file. Runs `validate` post-write and exits 1 if new errors are introduced.

# Proposed design

All commands are `defineCommand` modules under `packages/cli/src/commands/`. Each command imports from `@acta/core` only — no parsing logic or validation rules in the CLI layer. Helper modules provide config resolution (`context.ts`), output formatting (`output.ts`), slug generation (`slug.ts`), ID allocation (`id.ts`), and template rendering (`template.ts`).

Entry point `src/index.ts` registers all subcommands with `runMain` from citty. The `runMain` call is guarded by `import.meta.url` comparison so the module can be safely imported in tests without triggering CLI execution.

# Open questions

- Whether `acta show` should render Markdown body to terminal (requires `@acta/renderer`) or just print raw body text. Currently prints section titles only.
- Whether `acta list` table should support sorting flags in a future iteration.
