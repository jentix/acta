---
id: ADR-0001
kind: adr
title: Adopt Acta for architectural decisions
status: accepted
date: 2026-01-10T09:00:00.000Z
tags: [process, docs]
component: [demo]
owners: [Demo]
summary: This demo repo will use Acta to track decisions and specifications.
links:
  related: []
  supersedes: []
  replacedBy: []
  decidedBy: []
  dependsOn: []
  validates: []
  references: []
---

# Context

The demo project needs lightweight, machine-readable architectural records.

# Decision

Adopt Acta as the docs-as-code system of record for ADR and spec documents.

# Consequences

All non-trivial architectural decisions ship through `docs/decisions/` and are validated in CI.

# Alternatives

Free-form wiki pages, plain README sections, an external knowledge base.
