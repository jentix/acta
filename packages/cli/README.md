# @acta/cli

The `acta` command-line tool — TypeScript-first docs-as-code for **ADR** and **spec** documents in a Git repository.

Markdown stays the source of truth; Acta adds a strict document model, validation, graph artifacts and CLI workflows so a team can understand why decisions were made and which specs depend on them.

## Install

```sh
npm install -g @acta/cli
# or run without installing:
npx @acta/cli init
```

The installed binary is `acta`.

## Quick start

```sh
acta init
acta new adr "Adopt Acta"
acta new spec "Document workflow"
acta validate
acta build
```

`acta init` creates `acta.config.ts`, `docs/decisions/`, `docs/specs/` and starter templates under `docs/templates/`.

## Commands

| Command | Purpose |
|---|---|
| `acta init` | Create config, document folders and templates. |
| `acta new adr\|spec <title>` | Create a document with the next available ID. |
| `acta list` | List documents, filterable by kind/status/tag. |
| `acta show <id>` | Show metadata, sections, links and backlinks. |
| `acta validate` | Validate frontmatter, IDs, links, sections and graph rules. |
| `acta graph` | Print the relationship graph as Mermaid or JSON. |
| `acta build` | Write `.acta/dist` JSON artifacts. |
| `acta renumber <from> <to>` | Rename an ID and update internal links. |

Full reference: [github.com/jentix/acta](https://github.com/jentix/acta).

## License

MIT
