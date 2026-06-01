---
name: acta-document
description: >-
  Create and maintain Acta ADR/spec documents with the `acta` CLI. Use after
  implementing a feature, fixing a notable bug, or making an architectural
  decision, or when asked to document a decision, write an ADR, or create a spec.
allowed-tools: Bash
---

# Acta: document decisions and specs

Acta is a docs-as-code CLI that keeps Architecture Decision Records (ADRs) and
specs validated and linked in Git. Drive it through the `acta` binary; every
data command supports `--json` for reliable parsing. **Never scrape human
output — always pass `--json` and parse stdout.** Human logs go to stderr.

## When to use

- After implementing a feature or system → write a `spec`.
- After making an architectural decision (or choosing between options) → write an `adr`.
- When the user asks to "document this decision", "write an ADR", or "create a spec".

## Document model

| Kind | ID prefix | Directory |
| --- | --- | --- |
| `adr` | `ADR` | `docs/decisions/` |
| `spec` | `SPEC` | `docs/specs/` |

IDs are `<PREFIX>-<NNNN>` (zero-padded to width 4); the CLI allocates the next ID.

**ADR statuses:** `proposed`, `accepted`, `rejected`, `deprecated`, `superseded` (default `proposed`).
**Spec statuses:** `draft`, `active`, `paused`, `implemented`, `obsolete` (default `draft`).

### Link types (frontmatter `links:`)

| Key | Kind | Meaning |
| --- | --- | --- |
| `related` | internal | Loosely related documents. |
| `supersedes` | internal | This document supersedes the target; mirror with `replacedBy`. |
| `replacedBy` | internal | This document is replaced by the target. |
| `decidedBy` | internal | This spec was decided by an ADR. |
| `dependsOn` | internal | This document depends on the target decision. |
| `validates` | internal | This spec validates/implements an ADR decision. |
| `references` | external | External URLs only; must be valid http(s). |

Internal link keys (`related`, `supersedes`, `replacedBy`, `decidedBy`, `dependsOn`, `validates`) reference other
document IDs. `references` holds external URLs only.

### Required sections

- **ADR:** `# Context`, `# Decision`, `# Consequences`
- **Spec:** `# Summary`, `# Goals`, `# Requirements`

## Procedure

1. **Pick the kind.** Architectural decision → `adr`. Feature/system → `spec`.
2. **Create it** and capture the path from JSON:
   ```sh
   acta new adr "Short title" --json   # or: acta new spec "Short title" --json
   ```
   Returns `{ "id", "kind", "title", "status", "path", "relativePath" }`. Edit `path`.
3. **Fill frontmatter:** set `status`, `tags`, `component`, `owners`, a one-line
   `summary`, and `links` (use the link types above; `references` for external URLs).
4. **Fill required sections** (see above) with real content — no placeholders.
5. **Validate and fix-loop:**
   ```sh
   acta validate --json
   ```
   Returns `{ "valid", "errorCount", "warningCount", "issues": [{ severity, code, documentId, message, path, line }] }`.
   If `valid` is `false`, fix each `issues[].message` and re-run. Repeat until
   `valid` is `true` (cap at ~5 iterations; if still failing, report the issues).
6. **Verify links** with `acta show <id> --json` (inspect `links` and `backlinks`).

## Command reference (all accept `--json` unless noted)

- `acta new adr|spec "<title>" [--status <s>] [--tags a,b] [--id <ID>]` → created doc.
- `acta list [--kind adr|spec] [--status <s>] [--tag <t>]` → array of documents.
- `acta show <id>` → one normalized document with `links` + `backlinks`.
- `acta validate` → validation result; exit `1` if invalid.
- `acta graph --format json|mermaid|dot` → relationship graph.
- `acta build` → build manifest (`documentCount`, `errorCount`, `warningCount`).

Exit codes: `0` ok · `1` validation/operation failure · `2` usage error.
