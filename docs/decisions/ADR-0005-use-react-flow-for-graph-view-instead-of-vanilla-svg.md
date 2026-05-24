---
id: ADR-0005
kind: adr
title: Use React Flow for graph view instead of vanilla SVG
status: accepted
date: 2026-05-21T00:00:00.000Z
tags: [web, graph, react, architecture]
component: [acta-web]
owners: [Boris]
summary: The graph view in apps/web uses @xyflow/react (React Flow) for interactive rendering, superseding the vanilla SVG approach originally planned in SPEC-0005.
links:
  related: [SPEC-0005]
  supersedes: []
  replacedBy: []
  decidedBy: []
  dependsOn: [ADR-0003, SPEC-0005]
  validates: []
  references:
    - https://reactflow.dev
---

# Context

SPEC-0005 planned the graph view as a vanilla SVG implementation with plain browser JavaScript for pan/zoom, node highlighting, and filters — explicitly deferring any graph visualization dependency to keep the bundle small and the implementation static-build compatible.

The vanilla SVG prototype was implemented and functional. However, it required significant custom code for: coordinate layout, pan/zoom event handling, node hitboxes, edge routing, filter-driven visibility toggling, and hover highlighting. The resulting code in `apps/web/src/pages/graph.astro` grew to ~300 lines of interleaved HTML, SVG, and vanilla JS that was difficult to maintain and extend.

`apps/web` already uses Astro with React islands (added in Phase 3 for the homepage search island). React is therefore already a runtime dependency. React Flow (`@xyflow/react`) builds on React and provides production-quality pan/zoom, minimap, custom node types, edge routing, and controls out of the box.

# Decision

Replace the vanilla SVG graph implementation with a React island (`DocumentGraphIsland`) backed by `@xyflow/react`. Layout computation (`layout.ts`) and custom node rendering (`nodes.tsx`) are extracted into focused modules. The Astro page (`graph.astro`) becomes a thin server-rendered wrapper that passes pre-computed `DocumentGraph` data to the island.

The implementation keeps `@acta/core` as the sole source of graph semantics — layout, filtering, and rendering are concerns of `apps/web` only.

# Consequences

- `@xyflow/react` and its peer dependency `@xyflow/system` are added to `apps/web`. Bundle size increases, but React was already present.
- Pan/zoom, minimap, controls, and edge routing are provided by the library — no custom event handling required.
- Custom node types remain fully controlled via `nodeTypes` map; visual appearance is owned by the project.
- The SPEC-0005 constraint "without adding a graph visualization dependency" is superseded by this decision.
- The graph view is no longer static-HTML-compatible: it requires the React island to hydrate. This is acceptable because `apps/web` already uses client-side hydration for the search island.
- Future graph features (tooltips, animated edges, layout algorithms) can use React Flow APIs rather than requiring bespoke SVG code.

# Alternatives

- **Keep vanilla SVG**: Avoids the dependency, but the implementation is brittle and hard to extend. Rejected — React was already present; the complexity cost was not justified.
- **Use D3.js**: Mature force-directed graph library with fine-grained control. Rejected — D3 is imperative and integrates awkwardly with React's declarative model; React Flow provides better ergonomics at similar bundle cost.
- **Use Cytoscape.js**: Feature-rich but framework-agnostic, heavier than React Flow, and requires a wrapper layer for React. Rejected — React Flow is purpose-built for React and fits the existing stack.
- **Use vis-network**: Well-known, but not React-native and carries a large bundle. Rejected — same reasoning as Cytoscape.js.
