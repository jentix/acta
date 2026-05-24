---
id: ADR-0006
kind: adr
title: Use ISO 8601 datetime for the document `date` field
status: accepted
date: 2026-05-24T12:00:00.000Z
tags: [schema, docs, sort]
component: [acta-core]
owners: [Boris]
summary: The `date` and `updated` frontmatter fields are stored as ISO 8601 datetime with offset; the web viewer formats them back to `YYYY-MM-DD` for display.
links:
  related: [ADR-0001, ADR-0003]
  supersedes: []
  replacedBy: []
  decidedBy: []
  dependsOn: [ADR-0001, ADR-0003]
  validates: []
  references:
    - "https://en.wikipedia.org/wiki/ISO_8601"
---

# Context

The original document schema (defined in SPEC-0002) used day-grain `date: YYYY-MM-DD` in frontmatter. That format matches MADR convention and is what authors usually want to read, but it makes deterministic ordering ambiguous when several documents share the same day (common during a sprint kickoff or bulk import). Tie-breaking on `id` is not enough: dependency sorting and "newest first" views need real time ordering.

An initial attempt added a separate optional `createdAt: ISO 8601` field next to `date`. That created two near-redundant fields and forced authors to reason about which one matters when. Reviewers correctly flagged the duplication.

# Decision

Promote the existing `date` field to ISO 8601 datetime with offset (e.g. `2026-04-26T08:15:00.000Z`). Apply the same change to the optional `updated` field. Do not introduce a second time field. Acta keeps a single canonical timestamp per document state.

Concretely:

- `frontmatterSchema.date` validates as `z.string().datetime({ offset: true })`.
- `frontmatterSchema.updated` validates as `z.string().datetime({ offset: true }).optional()`.
- `acta new` writes `date: new Date().toISOString()` automatically.
- The web viewer adds `formatDisplayDate(iso) → 'YYYY-MM-DD'` and applies it to document list and document page. Time is intentionally hidden from authors and readers.
- The CLI `show` command applies the same day-grain formatting in the terminal.
- Sorting and graph ordering use the ISO string directly via lexicographic compare, which is correct for ISO 8601.
- Backward compat: the formatter accepts bare `YYYY-MM-DD` and returns it unchanged, so externally authored documents that have not migrated still render correctly. The schema, however, expects a full datetime; mid-migration repos should backfill.

# Consequences

- Document schema gains a single, precise timestamp that survives ordering, search index ranking and dependency layering without bespoke fields.
- Authors no longer hand-edit time. `acta new` produces the value; `acta show` and the web viewer hide it. Authors who need a different "decision date" can override the value manually with any valid ISO timestamp.
- All dogfooding documents and bundled test fixtures are migrated. Repos created from an older Acta will need to backfill `date` to ISO datetime before upgrading; an `acta migrate` helper is out of scope for the MVP and can be added later if real users hit this.
- The schema rejects bare `YYYY-MM-DD` values for `date` and `updated`. The validation error is explicit and points at the offending document.

# Alternatives

- **Keep separate `date` (day) and `createdAt` (datetime)**. Rejected: duplication, unclear precedence, more author cognitive load.
- **Allow either `YYYY-MM-DD` or full ISO in `date`**. Rejected for the canonical store: lexicographic ordering between mixed-precision values is correct but the resulting type is fuzzy and harder to reason about. The display formatter handles legacy day-only values for safety, but new documents must be full ISO.
- **Add an internal `createdAt` derived from git history**. Rejected for the MVP: requires git in build environment, breaks `acta build` outside a working tree, and couples the model to VCS metadata.
