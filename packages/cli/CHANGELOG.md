# @acta-dev/cli

## 1.5.1

### Patch Changes

- Updated dependencies [cc42a0f]
  - @acta-dev/web@1.1.0

## 1.5.0

### Minor Changes

- 78795c8: Add the Acta FastMCP server package, shared core search helper, and `acta init --mcp`.

### Patch Changes

- Updated dependencies [78795c8]
  - @acta-dev/core@1.2.0
  - @acta-dev/web@1.0.1

## 1.4.0

### Minor Changes

- 25634eb: Added commands for creating a github workflow for publishing to pages

## 1.3.0

### Minor Changes

- Add `acta skill --init` for skill-only installation. The command installs the
  bundled `acta-document` skill for Codex (`.agents/skills`) and Claude Code
  (`.claude/skills`) by default, with `--format codex|claude|both` for explicit
  targets. `acta init --skill` remains as compatibility behavior after project
  scaffolding.

## 1.2.0

### Minor Changes

- ce31589: Add local preview server for `acta site --serve`

## 1.1.0

### Minor Changes

- 2fe460c: Add `acta site` to build a deployable static web viewer from your docs outside the monorepo.
  - New `acta site` command: runs `acta build`, then builds the prebuilt `@acta-dev/web` viewer against your `.acta/dist` artifacts into `.acta/site/` (`--out`, `--base`, `--site`, `--skip-build`, `--json`).
  - The viewer now reads `acta build` artifacts (`.acta/dist`) instead of loading the project directly, so it is consumable outside this repo.
  - `@acta-dev/web` and `@acta-dev/renderer` are now published publicly (required by the consume-time viewer build).
  - New `site` config block (`outDir`, `base`, `url`) in `acta.config.ts`.

### Patch Changes

- Updated dependencies [2fe460c]
  - @acta-dev/core@1.1.0
  - @acta-dev/web@1.0.0

## 1.0.0

### Major Changes

- e25251e: First release of core packages, now them support json output

### Minor Changes

- e9e1c8e: Add the `acta-document` agent skill and `acta init --skill`. The CLI now bundles a universal `SKILL.md` (generated from the live core document model and CLI surface) that lets AI agents create, fill, and validate ADR/spec documents autonomously. `acta init --skill` installs it at `.claude/skills/acta-document/SKILL.md` and adds an idempotent guidance block to `AGENTS.md`. A contract test keeps the skill in sync with `@acta-dev/core`, and the repo doubles as a Claude Code plugin marketplace.

### Patch Changes

- Updated dependencies [e25251e]
  - @acta-dev/core@1.0.0
