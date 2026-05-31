---
id: SPEC-0007
kind: spec
title: Testing strategy and CI job layout
status: active
date: 2026-05-24T12:30:00.000Z
tags: [tests, ci, quality]
component: [acta-core, acta-cli, acta-web]
owners: [Boris]
summary: Defines the categories of automated checks Acta runs, what each category covers, where it lives in the repo, and how CI splits them into independent jobs.
links:
  related: [SPEC-0002, SPEC-0003, SPEC-0004]
  decidedBy: [ADR-0006]
  dependsOn: [SPEC-0002, SPEC-0003]
  validates: []
  references: []
---

# Summary

Acta has three distinct automated check categories: unit tests, an end-to-end fixture test, and a dogfooding content validation step. They are different in intent, run against different inputs, and should fail independently in CI so engineers can tell at a glance whether they broke code, the pipeline, or the project's own ADR/spec content.

# Goals

- Make the purpose of every automated check obvious from where it lives and how it is named.
- Catch regressions in pipeline behavior using a controlled fixture rather than the host repo's evolving content.
- Keep the host repo's ADR/spec corpus validated continuously so Acta dogfoods itself.
- Allow CI to surface lint, type, test, build and content-validation failures in separate jobs.

# Requirements

- Unit tests cover individual modules in `@acta-dev/core`, `@acta-dev/cli`, `@acta-dev/renderer` and `apps/web` and use isolated tmpdir fixtures created at test time.
- A single end-to-end suite (`packages/cli/src/test/e2e.test.ts`) exercises the documented user flow against a static fixture and against a tmpdir scaffolded from CLI commands.
- A static fixture repo lives at `tests/fixtures/demo-repo/` with its own `acta.config.ts`, templates and seed documents. The fixture is not scanned by the host repo's `acta validate`.
- CI runs lint, typecheck, tests, build and dogfood-validate as separate jobs. A failure in dogfood-validate must not block engineers from seeing unit test results, and vice versa.
- All test categories complete on a clean checkout without manual setup beyond `pnpm install`.

# Proposed design

## Test categories

### Unit tests

- Location: `packages/*/src/**/*.test.ts`, `apps/web/src/**/*.test.ts`.
- Scope: one module or a tightly coupled pair.
- Fixtures: each test creates its own tmpdir via `mkdtemp` and writes only what it needs. No test reads or writes the host repo's `docs/`.
- Run command: `pnpm test` (Vitest, per-package).

### End-to-end fixture test

- Location: `packages/cli/src/test/e2e.test.ts`.
- Inputs:
  - `tests/fixtures/demo-repo/` — a checked-in mini Acta project with two ADRs and two specs that exercise typed links and dependency ordering. Read-only at rest.
  - A tmpdir scaffolded at test time to cover `acta init` output and the `new → validate → build` flow.
- Asserts:
  - The fixture loads four documents, validates cleanly, derives expected backlinks and builds artifacts with `documentCount: 4` and topological order respecting `dependsOn`.
  - `acta init` writes the expected files into an empty tmpdir.
  - `acta new` produces documents with full ISO datetime `date`, `acta validate` reports zero errors, `acta build` writes `manifest.json` and `search-index.json` with expected contents.
  - `acta renumber` updates filenames, frontmatter IDs and internal references in place.
- Runs as part of `pnpm test`, alongside unit tests. No separate command is required.

### Dogfooding content validation

- Inputs: the host repo's actual `docs/decisions/` and `docs/specs/`.
- Purpose: prove that Acta keeps working on its own ADR/spec corpus and catches drift in real authored content (broken typed links, missing required sections, schema regressions after a refactor).
- Run command: `pnpm --filter @acta-dev/cli exec node dist/index.js validate`.
- This is content validation, not unit testing. A failure indicates either a content bug in a real ADR/spec or a code change that broke the contract those documents rely on.

## CI job layout

`.github/workflows/ci.yml` runs five jobs:

1. `lint` — `pnpm lint` and `pnpm format:check`.
2. `typecheck` — `pnpm typecheck`.
3. `test` — `pnpm test` (includes unit and e2e fixture tests).
4. `build` — `pnpm build`, depends on `typecheck`.
5. `dogfood-validate` — `acta validate` and `acta build` against the host repo's `docs/`, depends on `build` (needs the CLI dist).

Jobs that do not depend on each other run in parallel. A red signal in `dogfood-validate` is unambiguous: the ADR/spec corpus is invalid (or a contract change broke it), not a code-level test failure.

## Why a static fixture instead of generating one

The fixture is checked in for three reasons:

- Reviewers can read it like any other Acta project to understand expected shape.
- It exercises the same parser, validator and graph code paths the host repo uses, with a smaller surface area that is intentionally stable.
- It supports manual demo: `cd tests/fixtures/demo-repo && acta build` is a working playground for new contributors.

The fixture is intentionally read-only at rest. Tests that mutate state copy templates into a tmpdir and never write back to `tests/fixtures/`.

# Open questions

- Whether to publish a synthetic benchmark fixture (100/500/1000 documents) alongside the existing demo fixture for Phase 6.5 search scalability work.
- Whether `apps/web` should grow a Playwright smoke test before the first release, or wait until after the design pass.
