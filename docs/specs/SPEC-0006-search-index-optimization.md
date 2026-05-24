---
id: SPEC-0006
kind: spec
title: Search index optimization
status: implemented
date: 2026-05-03T00:00:00.000Z
tags: [search, performance]
component: [acta-core, acta-web]
owners: [Boris]
summary: Splits Acta search into a lightweight metadata index and a lazily loaded full-content index.
links:
  related: [SPEC-0004]
  decidedBy: []
  dependsOn: [ADR-0003, SPEC-0004]
  validates: [ADR-0003]
  references:
    - https://docs.orama.com/docs/orama-js
---

# Summary

Acta web search now uses two static artifacts instead of one large first-load payload. The primary `search-index.json` contains metadata fields only and is loaded for fast title, id, tag, owner, component, and summary search. The full `search-index-full.json` contains the same metadata plus section/body text and is loaded lazily when content search is needed.

# Goals

- Keep the first searchable payload small by loading metadata before full body text.
- Preserve the static viewer model: no API server, database, authentication, or write path.
- Keep Orama ranking in the browser and preserve existing filter behavior.
- Keep `/search?q=<query>` as the canonical shareable search URL.
- Provide a repeatable benchmark for 100, 500, and 1000 document repositories.

# Requirements

- `acta build` must write `.acta/dist/search-index.json` as the primary metadata index.
- `acta build` must write `.acta/dist/search-index-full.json` as the full-content index.
- The primary index must contain `id`, `href`, `kind`, `status`, `date`, `title`, `summary`, `tags`, `components`, and `owners`.
- The primary index must not contain `sectionsText` or `bodyText`.
- The full index must contain the primary fields plus `sectionsText` and `bodyText`.
- Metadata search must work before the full index is loaded.
- Body search must load lazily when the query length is greater than two characters or when the user enables content search explicitly.
- Search ranking must continue to boost `id`, `title`, and metadata fields above body matches.
- Existing kind/status/tag/component filters must still apply after Orama ranking.
- Query URL synchronization must continue to use only `q`; filters remain local UI state unless a later spec expands URL state.
- Existing `acta build`, web static build, and validation workflows must continue to pass with zero validation errors.

# Implementation

`packages/core/src/artifacts.ts` builds two search artifacts from the same `ActaDocument` list. `buildSearchIndex` remains the primary metadata-index API for compatibility. `buildFullSearchIndex` and `buildSearchIndexes` expose the full-content variant for `acta build` and the web static endpoint.

`apps/web/src/pages/search-index.json.ts` serves the primary index. `apps/web/src/pages/search-index-full.json.ts` serves the full index, with a matching localized route under `/ru/search-index-full.json` for static builds.

`apps/web/src/lib/search.ts` detects whether an index includes body fields and chooses the matching Orama schema and search properties. Primary search covers metadata only. Full search includes `sectionsText` and `bodyText` with lower boosts than id/title/metadata fields.

`apps/web/src/lib/search-client.ts` loads `/search-index.json` for metadata search and defers `/search-index-full.json` until the query is longer than two characters or the user enables “Search in content”. The document list shows a small loading indicator while the full index is fetched.

`tests/perf/search.bench.ts` generates synthetic 100, 500, and 1000 document indexes, prints raw/gzip sizes, and measures primary metadata search against full body search. The current 1000-document synthetic run keeps the primary index well under the 500KB gzip threshold.

# Deferred Work

- Orama binary/msgpack persistence is not enabled yet because the split primary payload is already below the threshold.
- Per-locale stemming and stop words are deferred until multilingual document-body search is specified.
- Chunking the full index by kind, document range, or payload size is deferred until `search-index-full.json` becomes too large for comfortable lazy loading.
- Web Worker search is deferred until benchmark data shows main-thread search latency is user-visible.
