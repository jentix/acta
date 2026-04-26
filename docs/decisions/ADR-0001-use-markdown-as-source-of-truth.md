---
id: ADR-0001
kind: adr
title: Use Markdown as the source of truth
status: accepted
date: 2026-04-26
tags: [docs, architecture, storage]
component: [acta-core]
owners: [Boris]
summary: Acta stores ADR and spec documents as Markdown files with YAML frontmatter in the repository.
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

Acta needs to help teams and coding agents understand architecture decisions and technical specs without moving knowledge into a separate database or hosted wiki. Documents should live near the code, go through normal code review, and keep Git as the version history.

# Decision

Acta will use Markdown files with YAML frontmatter as the source of truth for ADR and spec documents. Tooling will parse, validate, index, and render those files, but the documents remain ordinary repository files.

# Consequences

This keeps authoring simple and reviewable. It also means Acta must be careful about schema validation, link integrity, and generated artifacts because the raw files remain editable by hand.

# Alternatives

- Database-backed storage: rejected for MVP because it would add hosting, migration, and sync concerns.
- Web-only authoring: rejected for MVP because it would make the first version larger and less compatible with docs-as-code workflows.
- Plain Markdown without frontmatter: rejected because Acta needs typed metadata and links.
