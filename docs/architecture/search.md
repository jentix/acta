# Search Architecture

Acta ships a static client-side search index. The build now writes two artifacts:

- `.acta/dist/search-index.json` is the primary index. It stores metadata only: id, href, kind, status, date, title, summary, tags, components, and owners.
- `.acta/dist/search-index-full.json` is the full-content index. It includes the same metadata plus `sectionsText` and `bodyText`.

The web app loads the primary index first so `/search` can answer title, id, tag, component, owner, and summary queries without downloading document bodies. The full index is loaded lazily when the query is longer than two characters or when the user enables “Search in content”. A small loading indicator is shown while the full index is fetched.

## Thresholds

Keep the primary index below 500KB gzipped. If `search-index.json` crosses that threshold on the published demo, split metadata further before adding new search fields. The full index may exceed that size because it is not part of the initial search payload.

Compression is expected to happen at the static host layer. GitHub Pages serves static assets with transport compression where available, so the raw JSON remains the source artifact and gzip/brotli size is a deployment concern.

## Benchmark

Run the synthetic benchmark with:

```bash
pnpm exec vitest bench tests/perf/search.bench.ts
```

The benchmark generates 100, 500, and 1000 document indexes, prints raw and gzip sizes for primary/full artifacts, and measures Orama query time for metadata and body searches. Use it before changing searchable fields, boosts, or lazy-loading thresholds.
