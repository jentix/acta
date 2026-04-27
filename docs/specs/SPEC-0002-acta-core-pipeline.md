---
id: SPEC-0002
kind: spec
title: Acta core pipeline
status: active
date: 2026-04-26
tags: [core, validation, artifacts]
component: [acta-core]
owners: [Boris]
summary: Defines the Phase 1 core pipeline for parsing, validating, graphing and artifact generation.
links:
  related: [ADR-0003]
  decidedBy: [ADR-0001, ADR-0002, ADR-0003]
  dependsOn: [SPEC-0001]
  validates: []
  references: []
---

# Summary

Phase 1 turns `@acta/core` from a package skeleton into the canonical Acta data layer. It reads Markdown ADR/spec files, normalizes metadata, validates repository rules, derives links and writes artifacts for later consumers.

# Goals

- Provide typed document and config models.
- Parse ADR and spec Markdown files with YAML frontmatter.
- Validate IDs, lifecycle statuses, typed links, references and required sections.
- Build a UI-agnostic graph and minimal search-index artifact.
- Write generated artifacts under `.acta/` without committing generated state.

# Requirements

- Core exports `defineConfig`, `loadConfig`, `loadProject`, `validateProject`, `buildArtifacts` and related types.
- Config paths resolve relative to the config file location when loaded from disk.
- Optional frontmatter arrays and links normalize to empty arrays in the internal model.
- Internal documents are linked only through typed links; `references` is reserved for external HTTP(S) URLs.
- Artifact output includes `documents.json`, `graph.json`, `search-index.json`, `validation.json`, `manifest.json` and `content-cache.json`.
- Core must not depend on CLI, Astro, React or renderer packages.

# Proposed design

The pipeline loads config, scans configured ADR/spec directories, parses Markdown, normalizes documents, derives backlinks, builds the graph, validates repository rules and writes JSON artifacts. The search index is intentionally minimal in Phase 1 and stores enough document text and metadata for later CLI/web ranking.

# Open questions

- Whether the CLI should read artifacts by default or call `loadProject` directly for local commands.
- Whether the web viewer should use the same JSON artifacts unchanged or add a web-specific build step in Phase 3.
