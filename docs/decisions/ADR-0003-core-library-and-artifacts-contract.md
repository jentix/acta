---
id: ADR-0003
kind: adr
title: Use core library and artifacts as the Acta contract
status: accepted
date: 2026-04-26
tags: [core, artifacts, architecture]
component: [acta-core, acta-cli, acta-web]
owners: [Boris]
summary: Acta core is the canonical parser, validator, graph builder and artifact producer for all consumers.
links:
  related: [SPEC-0002]
  supersedes: []
  replacedBy: []
  decidedBy: []
  dependsOn: [ADR-0001, ADR-0002]
  validates: []
  references: []
---

# Context

Acta needs one consistent interpretation of ADR and spec documents. If the CLI, web viewer, CI and future MCP server parse Markdown independently, validation behavior and document metadata can drift.

# Decision

`@acta/core` will own the canonical document pipeline: config loading, Markdown parsing, schema normalization, validation, graph building, search-index generation and JSON artifact writing. CLI, web, CI and future MCP consumers will call the core library or read generated artifacts instead of reimplementing parsing rules.

# Consequences

This keeps downstream packages smaller and makes validation behavior consistent. The tradeoff is that core has to define a stable library API and artifact contract before the CLI and web packages are fully implemented.

# Alternatives

- Let each consumer parse Markdown directly: rejected because it would duplicate lifecycle, link and validation rules.
- Make Astro Content Collections the source of truth: rejected because core must be usable by CLI, CI and MCP without a web framework.
- Generate only web-specific data: rejected because Phase 2 and future integrations need a shared contract.
