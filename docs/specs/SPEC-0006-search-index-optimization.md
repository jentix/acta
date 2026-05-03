---
id: SPEC-0006
kind: spec
title: Search index optimization
status: draft
date: 2026-05-03
tags: []
component: [acta-core, acta-web]
owners: [Boris]
summary: Defines future optimizations for persisted and chunked Orama search indexes.
links:
  related: [SPEC-0004]
  decidedBy: []
  dependsOn: [ADR-0003, SPEC-0004]
  validates: [ADR-0003]
  references:
    - https://docs.orama.com/docs/orama-js
---

# Summary

Acta web search currently fetches one `search-index.json` artifact, builds an Orama index in the browser, and searches that in memory. This spec records the next optimization direction for larger repositories: reuse a persisted Orama index when available, split metadata search from body search, and lazy-load heavier body content without replacing the static web architecture.

# Goals

- Reduce repeated browser work when initializing search.
- Keep the first searchable payload small by loading metadata before full body text.
- Preserve the static viewer model: no API server, database, authentication, or write path.
- Prefer Orama-supported persistence/export APIs or plugins over a custom index serialization format.
- Keep `/search?q=<query>` as the canonical shareable search URL.

# Requirements

- The browser search module must reuse an initialized Orama database during a page session instead of rebuilding it for every query.
- If Orama provides a stable persistence API or plugin, Acta should store and load the persisted Orama index rather than inventing a custom serialized index format.
- The search artifact pipeline should support a lightweight metadata index containing `id`, `href`, `kind`, `status`, `date`, `title`, `summary`, `tags`, `components`, and `owners`.
- The body search payload should be separable from metadata and may include `sectionsText` and `bodyText`.
- Metadata search must be usable as soon as the metadata index is loaded.
- Body search may load lazily or in the background, but search must remain functional if the body index has not loaded yet.
- Query URL synchronization must continue to use only `q`; filters remain local UI state unless a later spec expands URL state.
- Existing `acta build`, web static build, and validation workflows must continue to pass with zero validation errors.

# Proposed design

The first implementation step should cache the initialized Orama database in `apps/web` so repeated queries do not rebuild the same in-memory index. This is a small compatibility-preserving improvement on top of the current `/search-index.json` artifact.

The next step should split search artifacts into at least two browser payloads:

- `search-index.meta.json` for metadata fields that make initial search and result rendering fast.
- `search-index.body.json` or chunked body payloads for section and full body text.

The web search module should load the metadata index first, initialize metadata search immediately, and then load body search in the background. Once body search is ready, full-text results can be merged into the same result list while preserving the existing filters and `/search?q=` behavior.

If Orama persistence can serialize the prepared index during build and restore it in the browser, Acta should use that path for the metadata index first. Body persistence can be evaluated after chunking because large body indexes may be better loaded by chunk, by kind, or on demand.

# Open questions

- Which Orama persistence API or plugin is stable enough for Acta's supported Node/browser versions?
- Should body chunks be split by document kind, document ID range, first letter, or approximate payload size?
- At what repository size should Acta switch from single-file body payloads to chunked body payloads?
- Should search run in a Web Worker once index loading or persistence restore becomes expensive on the main thread?
