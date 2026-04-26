---
id: ADR-0002
kind: adr
title: Use a TypeScript monorepo
status: accepted
date: 2026-04-26
tags: [tooling, architecture, typescript]
component: [acta-core, acta-cli, acta-web]
owners: [Boris]
summary: Acta uses a pnpm TypeScript monorepo with separate packages for core, CLI, renderer, and web.
links:
  related: [ADR-0001, SPEC-0001]
  supersedes: []
  replacedBy: []
  decidedBy: []
  dependsOn: [ADR-0001]
  validates: []
  references: []
---

# Context

Acta has several consumers for the same document model: CLI, static web viewer, CI validation, and a future MCP server. These consumers need shared types and validation behavior without copying business logic.

# Decision

Acta will use a pnpm TypeScript monorepo. `@acta/core` will own the document model and future parser/validator pipeline, while `@acta/cli`, `@acta/renderer`, and `@acta/web` remain separate consumers.

# Consequences

The package boundaries make the core reusable and keep UI or terminal concerns out of the data layer. The tradeoff is more initial workspace setup, which Phase 0 absorbs before core implementation starts.

# Alternatives

- Single package: simpler at first, but likely to blur CLI, web, and core boundaries.
- Multiple repositories: rejected because the packages are tightly coupled during MVP development.
- Non-TypeScript implementation: rejected because runtime validation and generated types are central to the design.
