---
id: SPEC-0005
kind: spec
title: Graph view and dependency ordering
status: implemented
date: 2026-05-02
tags: [web, graph, ordering, phase-3]
component: [acta-core, acta-web]
owners: [Boris]
summary: Adds reusable dependency ordering artifacts and an interactive graph view to the Acta web viewer.
links:
  related: [SPEC-0004]
  decidedBy: [ADR-0003]
  dependsOn: [ADR-0003, SPEC-0002, SPEC-0004]
  validates: [ADR-0003]
  references: []
---

# Summary

This spec extends the Acta web viewer with a graph page and dependency-aware document ordering. `@acta/core` remains the source of truth for graph semantics by exposing a reusable ordering projection and by writing `ordering.json` during artifact builds.

# Goals

- Let readers inspect ADR/spec relationships visually from the web viewer.
- Let readers switch the homepage document list between newest-first order and dependency order.
- Keep ordering semantics in `@acta/core`, not duplicated in `apps/web`.
- Preserve static rendering and small client-side behavior without adding a graph visualization dependency.

# Requirements

- `@acta/core` must expose an ordering graph separate from the full internal-link graph.
- Ordering must use causal links only: `dependsOn`, `decidedBy`, `validates`, `supersedes`, and `replacedBy`.
- `related` must remain visible in graph view but must not affect dependency ordering.
- `references` must remain external-only and must not affect ordering or graph layout.
- `acta build` must write `.acta/dist/ordering.json` alongside existing artifacts.
- The homepage must keep the existing newest-first list and add a dependency-order sorting mode.
- `/graph/` must render an interactive SVG graph with clickable document nodes, pan/zoom, reset, node highlighting, and kind/status filters.
- The implementation must remain read-only and static-build compatible.

# Proposed design

`@acta/core` adds `buildOrderingGraph`, `sortDocumentsByDependency`, and `buildDependencyLayers`. The ordering graph reverses link direction where needed so every edge points from earlier/foundational document to later/dependent document. `replacedBy` points from the current/old document to the replacement document.

`loadProject` includes `project.ordering`, and `buildArtifacts` writes the same structure to `ordering.json`. Cycles do not fail builds by themselves; ordering remains deterministic using newest-first tie breaking and exposes cycle metadata for future UI or validation improvements.

`apps/web` renders homepage rows with both newest-order and dependency-order indices. Client-side filtering first finds matching rows, then applies the selected sort mode, then applies pagination.

The graph page uses `project.graph` for all internal edges and `project.ordering.layers` for left-to-right layout ranks. The SVG is enhanced with vanilla browser code for pan/zoom, reset view, hover/focus highlighting, and kind/status filtering.

# Acceptance criteria

- `pnpm --filter @acta/core test` verifies ordering graph semantics, sorting, layers, cycles, and artifact output.
- `pnpm --filter @acta/web test` verifies document ordering utilities.
- `pnpm --filter @acta/web build` emits `/graph/index.html`.
- `pnpm exec acta build` emits `.acta/dist/ordering.json` with zero manifest errors.
- The graph page is reachable from the sidebar and document nodes link to their document pages.
