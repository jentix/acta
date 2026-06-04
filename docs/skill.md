# Agent skill: `acta-document`

Acta ships an agent skill that lets an AI coding agent document completed work on
its own: pick the document kind, create it with the CLI, fill frontmatter and the
required sections, then run the `acta validate` fix-loop until the document is
valid. It is a universal `SKILL.md` — the same file works for Claude Code and is
also surfaced to Codex / Cursor / Gemini through `AGENTS.md`.

## What it does

Given a finished task, the skill drives this loop (all steps use `--json`):

1. `adr` for an architectural decision, `spec` for a feature or system.
2. `acta new adr|spec "<title>" --json` → capture the file path.
3. Fill frontmatter (`status`, `tags`, `component`, `owners`, `summary`, `links`)
   and the required sections.
4. `acta validate --json` → fix each `issues[].message` → repeat until `valid`.
5. `acta show <id> --json` → confirm `links` and `backlinks`.

## Installing it

Three ways, pick one:

### 1. Into your repo (recommended)

```sh
acta skill --init
```

Writes both `.agents/skills/acta-document/SKILL.md` for Codex-compatible repo
skills and `.claude/skills/acta-document/SKILL.md` for Claude Code project
skills. It also adds an
`<!-- acta:skill:start -->…<!-- acta:skill:end -->` block to your `AGENTS.md`
(created if missing, replaced idempotently if already present). The skill content
is bundled inside the `acta` CLI you have installed, so it always matches your CLI
version — see [Staying in sync](#staying-in-sync).

Install only one target when needed:

```sh
acta skill --init --format codex
acta skill --init --format claude
```

`acta init --skill` remains available as a compatibility path, but it also runs
the full project initialization flow. Use `acta skill --init` when you only want
to add or refresh the skill.

### 2. As a Claude Code plugin

This repository is also a plugin marketplace:

```
/plugin marketplace add jentix/acta
/plugin install acta
```

The plugin bundles the same `acta-document` skill.

### 3. Manually

Copy [`skills/acta-document/SKILL.md`](../skills/acta-document/SKILL.md) into your
project's `.agents/skills/acta-document/` or `.claude/skills/acta-document/`
directory.

## Staying in sync

The skill describes the live CLI surface and document model (kinds, statuses, link
types, required sections). Keeping it accurate is enforced mechanically, not by
memory:

- **One source of truth.** `packages/cli/src/skill.ts` (`renderSkill()`) builds the
  skill text by interpolating `@acta-dev/core`'s canonical exports
  (`documentKinds`, `adrStatuses`, `specStatuses`, `linkKeys`) plus the config's
  required sections. The data tables are never hand-typed.
- **Version-locked delivery.** The skill is bundled in `@acta-dev/cli`, so the skill
  a user gets from `acta skill --init` is exactly the one matching their installed
  CLI version.
- **Drift fails CI.** `packages/cli/src/skill-contract.test.ts` asserts that the
  committed `SKILL.md` copies are byte-identical to `renderSkill()` and that the
  rendered text contains every status, kind, and link key exported by core. Change
  the model in core without regenerating and the test goes red.
- **Regenerate** the committed copies with:

  ```sh
  pnpm gen:skill
  ```

  This rewrites `skills/acta-document/SKILL.md` and the plugin's copy. Run it
  whenever the document model or CLI surface changes, then commit the result.
