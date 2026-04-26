---
id: SPEC-0001
kind: spec
title: Acta MVP bootstrap
status: active
date: 2026-04-26
tags: [mvp, bootstrap, tooling]
component: [acta-core, acta-cli, acta-web]
owners: [Boris]
summary: Defines the Phase 0 repository bootstrap for Acta before core parser and validator work begins.
links:
  related: [ADR-0001, ADR-0002]
  decidedBy: [ADR-0001, ADR-0002]
  dependsOn: []
  validates: []
  references: []
---

# Summary

Phase 0 establishes Acta as a TypeScript monorepo with explicit package boundaries, tooling, templates, and dogfooding documents. It intentionally avoids implementing parser, validator, graph, search, or web viewer behavior.

# Goals

- Rename the project and technical contracts to Acta.
- Create the workspace skeleton for core, CLI, renderer, and web packages.
- Configure baseline build, test, typecheck, lint, and format checks.
- Add initial ADR/spec documents and reusable templates.

# Requirements

- The CLI command name is reserved as `acta`.
- Package names use the `@acta/*` scope.
- Generated Acta state uses `.acta/` and is ignored by Git.
- The repository can install dependencies and run baseline checks.

# Proposed design

The root workspace owns shared scripts and tooling. Each package contains a minimal TypeScript entrypoint and smoke test so the monorepo can verify build, typecheck, and test wiring before Phase 1 adds real core behavior.

# Open questions

- Whether `@acta/web` remains a private app package or becomes a publishable viewer package after the Astro implementation exists.
- Whether the initial public npm package should be `acta` or `@acta/cli`.
