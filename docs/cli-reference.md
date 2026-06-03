# Acta CLI Reference

This reference documents the current `acta` command surface. In this repository, run commands through `pnpm exec acta` after `pnpm install` and `pnpm build`. In an installed package, use `acta` directly.

## Global Behavior

Acta resolves `acta.config.ts` from the current working directory by default. Commands that accept `--config` can load a different config file.

Exit codes:

| Code | Meaning |
|---|---|
| `0` | Command succeeded. |
| `1` | Validation error, build failure or document operation failure. |
| `2` | CLI usage error, such as an invalid argument or flag value. |

### JSON output for tooling and agents

Commands that produce data accept `--json` and write a stable, machine-readable
payload to **stdout** (human-facing logs and errors go to **stderr**). This lets
AI agents and scripts drive Acta without scraping formatted text:

| Command | `--json` payload |
|---|---|
| `acta new adr\|spec` | `{ id, kind, title, status, path, relativePath }` for the created document. |
| `acta list` | Array of `{ id, kind, title, status, date, tags, component, owners, summary }`. |
| `acta show <id>` | The full normalized document, including body, sections, links, backlinks and file metadata. |
| `acta validate` | The full validation result (`valid`, `errorCount`, `warningCount`, `issues[]`). Exit `1` if invalid. |
| `acta graph` | Use `--format json` for the relationship graph (nodes + edges). |
| `acta build` | The build manifest (`documentCount`, `errorCount`, `warningCount`, `builtAt`, `outDir`). Exit `1` on validation errors. |

A typical agent loop: `acta new adr "..." --json` → fill the file → `acta validate --json` → inspect `issues[]` → fix → repeat until `valid` is `true`.

## `acta init`

Initialize Acta in the current repository.

```sh
acta init
```

Creates:

- `acta.config.ts`
- `docs/decisions/`
- `docs/specs/`
- `docs/templates/adr.md`
- `docs/templates/spec.md`

Flags:

| Flag | Description |
|---|---|
| `--yes`, `-y` | Skip prompts and overwrite existing generated files. |
| `--hooks` | Write a Lefthook workflow template. |
| `--github-action` | Write a GitHub Actions workflow template. |
| `--skill` | Install the `acta-document` agent skill at `.claude/skills/acta-document/SKILL.md` and add an Acta guidance block to `AGENTS.md`. See [skill.md](skill.md). |
| `--config`, `-c` | Accepted for consistency; init currently writes `acta.config.ts` in the current directory. |

Examples:

```sh
acta init --hooks
acta init --github-action
acta init --skill
acta init --hooks --github-action --skill --yes
```

## `acta new adr <title>`

Create a new ADR from `docs/templates/adr.md`.

```sh
acta new adr "Use PostgreSQL"
```

Flags:

| Flag | Description |
|---|---|
| `--id <id>` | Override the next auto-allocated ID, for example `ADR-0007`. |
| `--status <status>` | Set initial ADR status. Defaults to `proposed`. |
| `--tags <tags>` | Write comma-separated tags to frontmatter. |
| `--json` | Print the created document as JSON: `{ id, kind, title, status, path, relativePath }`. |
| `--config`, `-c` | Path to `acta.config.ts`. |

Valid ADR statuses:

```txt
proposed, accepted, rejected, deprecated, superseded
```

## `acta new spec <title>`

Create a new spec from `docs/templates/spec.md`.

```sh
acta new spec "Storage layer"
```

Flags:

| Flag | Description |
|---|---|
| `--id <id>` | Override the next auto-allocated ID, for example `SPEC-0005`. |
| `--status <status>` | Set initial spec status. Defaults to `draft`. |
| `--tags <tags>` | Write comma-separated tags to frontmatter. |
| `--json` | Print the created document as JSON: `{ id, kind, title, status, path, relativePath }`. |
| `--config`, `-c` | Path to `acta.config.ts`. |

Valid spec statuses:

```txt
draft, active, paused, implemented, obsolete
```

## `acta list`

List documents in the repository.

```sh
acta list
```

Flags:

| Flag | Description |
|---|---|
| `--kind <kind>`, `-k` | Filter by `adr` or `spec`. |
| `--status <status>`, `-s` | Filter by lifecycle status. |
| `--tag <tag>`, `-t` | Filter by tag. |
| `--json` | Print machine-readable JSON. |
| `--config`, `-c` | Path to `acta.config.ts`. |

Examples:

```sh
acta list --kind adr
acta list --status accepted
acta list --tag platform --json
```

## `acta show <id>`

Show one document by ID.

```sh
acta show ADR-0001
```

The human-readable output includes metadata, summary, section headings, outgoing links and backlinks.

Flags:

| Flag | Description |
|---|---|
| `--json` | Print the normalized document as JSON, including body and file metadata. |
| `--config`, `-c` | Path to `acta.config.ts`. |

Examples:

```sh
acta show SPEC-0001
acta show ADR-0001 --json
```

## `acta validate`

Validate all configured documents.

```sh
acta validate
```

Checks include:

- frontmatter schema
- ID prefixes and duplicate IDs
- filename convention
- broken internal links
- invalid external references
- required sections
- supersession cycles and asymmetric supersession links
- implemented specs without decision links
- orphan documents
- optional owner allowlist

Flags:

| Flag | Description |
|---|---|
| `--ci` | Write `.acta/dist/validation.json` and use concise output. |
| `--json` | Print the full validation result to stdout. |
| `--config`, `-c` | Path to `acta.config.ts`. |

Examples:

```sh
acta validate
acta validate --ci
acta validate --json
```

## `acta graph`

Print the document relationship graph.

```sh
acta graph
```

Flags:

| Flag | Description |
|---|---|
| `--format <format>`, `-f` | `mermaid` or `json`. Defaults to `mermaid`. |
| `--config`, `-c` | Path to `acta.config.ts`. |

Examples:

```sh
acta graph --format mermaid
acta graph --format json
```

## `acta build`

Build normalized artifacts into `.acta/dist`.

```sh
acta build
```

Generated files:

```txt
.acta/dist/documents.json
.acta/dist/graph.json
.acta/dist/manifest.json
.acta/dist/ordering.json
.acta/dist/search-index.json
.acta/dist/search-index-full.json
.acta/dist/validation.json
```

Flags:

| Flag | Description |
|---|---|
| `--json` | Print the build manifest as JSON (`documentCount`, `errorCount`, `warningCount`, `builtAt`, `outDir`). |
| `--config`, `-c` | Path to `acta.config.ts`. |

The command exits with code `1` if validation errors exist, but it still writes artifacts so CI and the web viewer can inspect the result.

## `acta site`

Build a deployable static web viewer from your docs, with **no monorepo clone required**. It runs `acta build` to refresh `.acta/dist`, then builds the prebuilt `@acta-dev/web` viewer against those artifacts and writes the static site to `.acta/site/`.

```sh
acta site
acta site --serve
```

Output:

```txt
.acta/site/        # static HTML/CSS/JS — deploy to any static host
```

Flags:

| Flag | Description |
|---|---|
| `--out` | Output directory for the site (default: `.acta/site`, or `site.outDir` in config). |
| `--base` | Base path for hosting under a subpath, e.g. `/my-repo` for GitHub project pages. Falls back to `site.base`. |
| `--site` | Absolute site URL for canonical links/sitemaps. Falls back to `site.url`. |
| `--skip-build` | Reuse existing `.acta/dist` artifacts instead of rebuilding first. |
| `--serve` | Serve the generated site locally after building. |
| `--host` | Host for `--serve`. Defaults to `127.0.0.1`. |
| `--port` | Port for `--serve`. Defaults to `4321`. |
| `--config`, `-c` | Path to `acta.config.ts`. |
| `--json` | Print `{ ok, outDir, base, site, documentCount }` as JSON. |

Config defaults live under the `site` block in `acta.config.ts`:

```ts
export default defineConfig({
  site: {
    outDir: ".acta/site",
    base: "/my-repo",            // optional, for project pages
    url: "https://docs.example", // optional, canonical URL
  },
});
```

> The viewer is built on demand from the published `@acta-dev/web` package, so the first `acta site` run downloads Astro and its build dependencies. Deploy the contents of the output directory with any static host or CI workflow.

Use `acta site --serve` for a local preview. The built-in server is intended for development only and keeps running until `Ctrl+C`.

## `acta renumber <from> <to>`

Rename a document ID, update the filename and rewrite all internal links that referenced the old ID.

```sh
acta renumber ADR-0001 ADR-0042
```

Flags:

| Flag | Description |
|---|---|
| `--dry-run` | Print the planned changes without writing files. |
| `--config`, `-c` | Path to `acta.config.ts`. |

Examples:

```sh
acta renumber ADR-0001 ADR-0042 --dry-run
acta renumber SPEC-0001 SPEC-0010
```

Renumbering cannot move a document across kinds. For example, `ADR-0001` cannot become `SPEC-0001`.
