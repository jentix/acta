---
id: SPEC-0004
kind: spec
title: Acta web viewer
status: active
date: 2026-05-01
tags: [web, phase-3]
component: [acta-web, acta-renderer]
owners: [Boris]
summary: Defines the read-only Astro web viewer for browsing Acta ADR and spec documents.
links:
  related: []
  supersedes: []
  replacedBy: []
  decidedBy: [ADR-0003]
  dependsOn: [ADR-0003, SPEC-0002, SPEC-0003]
  validates: [ADR-0003]
  references:
    - https://astro.build/blog/astro-620/
---

# Summary

Phase 3 implements a read-only static Astro web viewer for Acta documents. The viewer loads documents through `@acta/core`, renders Markdown through `@acta/renderer`, and exposes a compact interface for browsing documents, metadata, links, backlinks and validation results.

# Goals

- Make the repository's ADRs and specs usable through a local web interface.
- Keep Markdown and `@acta/core` as the source of truth.
- Provide client-side search and filters without adding a server or database.
- Show validation errors and warnings inside the viewer.
- Keep the interface minimal, dense and work-focused.

# Requirements

- The web app must be an Astro 6 static app under `apps/web`.
- Astro dev/build must load documents by calling `loadProject` and `validateProject` from `@acta/core`.
- The web app must not use Astro Content Collections as the canonical parser.
- The homepage must show repository counts, validation summary, filters, search and a document list.
- Each document page must show metadata, rendered Markdown body, outgoing internal links, backlinks, external references and document-specific validation issues.
- A validation page must list all validation errors and warnings, including issues that do not map to a document.
- Search must check IDs, titles, summaries, tags, components, owners and section/body content.
- Filters must support kind, status, tag and component.
- Markdown rendering must sanitize unsafe HTML.
- The viewer is read-only; editing documents through web is out of scope.

# Proposed design

`@acta/renderer` exposes `renderMarkdown(markdown)` using unified, remark and rehype. The output is sanitized HTML intended for static rendering by Astro.

`apps/web` resolves the repository root by walking upward to `acta.config.ts`, loads the project through core, and generates static pages from the normalized document model. Client-side filtering is implemented with small inline JavaScript against rendered document rows, keeping the app framework-free.

The visual design uses a restrained two-column layout on desktop and a single-column mobile layout. Styling lives in `apps/web/src/styles/global.css` and uses system fonts, neutral colors, compact spacing and semantic badges.

# Acceptance criteria

- `pnpm dev:web` starts the local Astro viewer.
- `pnpm --filter @acta/web build` emits a static site.
- Homepage lists current ADR and spec documents.
- Search and filters narrow the document list without a page reload.
- Document pages render Markdown and show links/backlinks.
- `/validation/` reflects the current Acta validation result.
- Workspace lint, typecheck, tests, build, `acta validate` and `acta build` pass.
