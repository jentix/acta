# Contributing

This repository is a pnpm TypeScript monorepo. Acta dogfoods its own ADR and spec workflow, so significant product or architecture changes should be documented under `docs/decisions/` or `docs/specs/`.

## Setup

```sh
pnpm install
pnpm build
pnpm test
```

Recommended runtime:

```txt
Node >=22.12 <26
pnpm 11.x
```

## Package Boundaries

| Package | Responsibility |
|---|---|
| `packages/core` | Canonical document pipeline: config, parser, schema, validation, graph, ordering, search index and artifacts. |
| `packages/cli` | Thin terminal layer over `@acta/core`: args, output formatting, exit codes and scaffolding. |
| `packages/renderer` | Markdown-to-HTML helpers used by web rendering. |
| `apps/web` | Static Astro viewer for documents, graph, search and validation results. |

Keep business rules in `@acta/core`. CLI and web code should call core APIs or read core artifacts instead of duplicating parsing or validation behavior.

## Verification

Run the full workflow before marking a phase complete:

```sh
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm exec acta validate
pnpm exec acta build
```

Faster package-level commands:

```sh
pnpm --filter @acta/core test
pnpm --filter @acta/cli test
pnpm --filter @acta/web test
pnpm --filter @acta/cli typecheck
pnpm --filter @acta/web build
```

## Test Categories

| Area | Location | Purpose |
|---|---|---|
| Core unit tests | `packages/core/src/*.test.ts` | Parser, config, validation, graph, ordering and artifacts behavior. |
| CLI tests | `packages/cli/src/test/*.test.ts` | Command behavior using temporary fixtures. |
| Web tests | `apps/web/src/lib/*.test.ts` | Viewer data loading and search helpers. |
| E2E flow | `packages/cli/src/test/e2e.test.ts` | Document authoring and artifact build workflow. |
| Performance | `tests/perf/` | Search and scalability benchmarks. |

## Adding a Validation Rule

1. Add the rule to `packages/core/src/validation.ts`.
2. Keep the rule pure: read from the validation context and return `ValidationIssue[]`.
3. Add focused tests in `packages/core/src/validation.test.ts` or the closest existing core test.
4. If the rule has configurable severity, add the config field in `packages/core/src/config.ts` and document it in `docs/configuration.md`.
5. Run `pnpm --filter @acta/core test` and the full verification workflow.

## Adding a CLI Command

1. Add one command module under `packages/cli/src/commands/`.
2. Register it in `packages/cli/src/index.ts`.
3. Keep document logic in `@acta/core`; the CLI should parse args, call core APIs and format output.
4. Add tests under `packages/cli/src/test/`.
5. Update `README.md` and `docs/cli-reference.md`.
6. Run `pnpm --filter @acta/cli test` and the full verification workflow.

## Adding or Changing Document Templates

Templates live under `docs/templates/` and are copied by `acta init`. They should keep required frontmatter fields and required sections aligned with `packages/core/src/schema.ts` and `packages/core/src/config.ts`.

After changing templates:

```sh
pnpm exec acta validate
pnpm --filter @acta/cli test
```

## Documentation Workflow

Use Acta itself for project documentation:

```sh
pnpm exec acta new adr "Decision title"
pnpm exec acta new spec "Feature name"
pnpm exec acta validate
```

ADRs must include:

```txt
Context, Decision, Consequences, Alternatives
```

Specs must include:

```txt
Summary, Goals, Requirements
```

## Release Workflow

Acta uses Changesets for package versioning and changelog generation.
`@acta/cli` and `@acta/core` are public npm packages; `@acta/renderer` and `@acta/web` remain private implementation packages for the MVP.

Prepare a release:

```sh
pnpm changeset
pnpm version-packages
pnpm install
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm exec acta validate
pnpm exec acta build
```

Publish after the verification workflow is green and npm authentication is configured:

```sh
pnpm release
git tag v0.1.1
git push origin main --tags
```

The dogfooding viewer is deployed by `.github/workflows/deploy-pages.yml` on pushes to `main`. The workflow builds the CLI, runs `acta build` for repository artifacts, builds `@acta/web`, and uploads `apps/web/dist` to GitHub Pages.
