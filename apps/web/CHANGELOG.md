# @acta-dev/web

## 1.1.0

### Minor Changes

- cc42a0f: Refactor all web app styles, add sidebar menu for mobiles

## 1.0.1

### Patch Changes

- 78795c8: Add the Acta FastMCP server package, shared core search helper, and `acta init --mcp`.
- Updated dependencies [78795c8]
  - @acta-dev/core@1.2.0

## 1.0.0

### Major Changes

- 2fe460c: Add `acta site` to build a deployable static web viewer from your docs outside the monorepo.
  - New `acta site` command: runs `acta build`, then builds the prebuilt `@acta-dev/web` viewer against your `.acta/dist` artifacts into `.acta/site/` (`--out`, `--base`, `--site`, `--skip-build`, `--json`).
  - The viewer now reads `acta build` artifacts (`.acta/dist`) instead of loading the project directly, so it is consumable outside this repo.
  - `@acta-dev/web` and `@acta-dev/renderer` are now published publicly (required by the consume-time viewer build).
  - New `site` config block (`outDir`, `base`, `url`) in `acta.config.ts`.

### Patch Changes

- Updated dependencies [2fe460c]
  - @acta-dev/core@1.1.0
  - @acta-dev/renderer@1.0.0
