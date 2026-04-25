---
id: SPEC-0001
kind: spec
title: ADR Book document model
status: active
date: 2026-04-17
tags: [model, docs]
component: [adr-book-core]
owners: [Team]
summary: Defines the document model, statuses, and document relationships.
links:
  related: [ADR-0001]
  supersedes: []
  replacedBy: []
  decidedBy: [ADR-0001]
  dependsOn: []
  validates: []
  references: []
---

# Summary

ADR Book stores architecture decisions and technical specifications as Markdown documents with typed metadata and links.

# Goals

- Keep documents readable in GitHub.
- Validate structure in CI.
- Build a static viewer for navigation.

# Requirements

- Unique document ids across ADRs and specs.
- Typed links must resolve.
- The viewer must read generated artifacts instead of raw Markdown files.

# Proposed design

Use a shared parser and validator in the core package, a CLI for authoring and build steps, and a static React app for browsing the generated data.

# Open questions

- When should search move beyond a client-side JSON index?
