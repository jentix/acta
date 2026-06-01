# @acta-dev/cli

## 1.0.0

### Major Changes

- e25251e: First release of core packages, now them support json output

### Minor Changes

- e9e1c8e: Add the `acta-document` agent skill and `acta init --skill`. The CLI now bundles a universal `SKILL.md` (generated from the live core document model and CLI surface) that lets AI agents create, fill, and validate ADR/spec documents autonomously. `acta init --skill` installs it at `.claude/skills/acta-document/SKILL.md` and adds an idempotent guidance block to `AGENTS.md`. A contract test keeps the skill in sync with `@acta-dev/core`, and the repo doubles as a Claude Code plugin marketplace.

### Patch Changes

- Updated dependencies [e25251e]
  - @acta-dev/core@1.0.0
