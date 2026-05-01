---
id: ADR-0004
kind: adr
title: Use citty for Acta CLI framework
status: accepted
date: 2026-05-01
tags: [cli, architecture]
component: [acta-cli]
owners: [Boris]
summary: Acta CLI uses citty as its argument parsing and subcommand framework, with all business logic delegated to @acta/core.
links:
  related: [SPEC-0003]
  supersedes: []
  replacedBy: []
  decidedBy: []
  dependsOn: [ADR-0003]
  validates: []
  references: []
---

# Context

Phase 2 requires a CLI package (`@acta/cli`) that exposes `acta init`, `acta new`, `acta list`, `acta show`, `acta validate`, `acta graph`, `acta build`, and `acta renumber` commands. The CLI needs argument parsing, subcommand routing, auto-generated help, and clean exit code handling. Multiple CLI frameworks are available for Node.js ESM projects.

# Decision

Use `citty` as the CLI framework. `citty` is lightweight, ESM-native, supports nested subcommands via `defineCommand` + `subCommands`, generates help output automatically, and has no heavy dependencies. The `@acta/cli` package is a thin orchestration layer: it parses arguments with citty, calls `@acta/core` APIs for all document logic, formats output for the terminal, and sets process exit codes. No validation rules, parsing logic, or document model live in the CLI package.

# Consequences

- CLI commands are simple `defineCommand` modules that import from `@acta/core`.
- The `packages/cli` build is small (single ESM bundle via tsup).
- Adding new commands requires no framework changes — just a new `defineCommand` module.
- The thin-layer principle must be enforced: CLI tests verify behavior through core APIs, not by reimplementing rules.
- `acta dev` (watch mode) is deferred to Phase 4 and does not affect this choice.

# Alternatives

- **clipanion**: More powerful with class-based commands and full TypeScript types, but heavier and more opinionated. Rejected — citty is sufficient for the MVP command surface.
- **yargs**: Battle-tested but CommonJS-first and larger bundle. Rejected — ESM ergonomics are worse for this project.
- **commander**: Popular but requires manual subcommand wiring without citty's `subCommands` map. Rejected — citty's API is cleaner for the nested `acta new adr` / `acta new spec` pattern.
- **Custom arg parser**: No maintenance burden but no auto-help or future extensibility. Rejected — framework value is worth the dependency.
