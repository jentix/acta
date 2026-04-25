---
id: ADR-0001
kind: adr
title: Use Markdown documents with YAML frontmatter
status: accepted
date: 2026-04-17
tags: [docs, architecture]
component: [adr-book-core]
owners: [Team]
summary: Store ADRs and specs as Markdown files with machine-readable metadata.
links:
  related: [SPEC-0001]
  supersedes: []
  replacedBy: []
  decidedBy: []
  dependsOn: []
  validates: []
  references: []
---

# Context

The repository needs docs-as-code documents that stay readable in GitHub and still work as structured input for tooling.

# Decision

Store ADRs and specs as Markdown files with YAML frontmatter.

# Consequences

The CLI and web viewer can operate on a strict metadata model while the source stays plain Markdown.
