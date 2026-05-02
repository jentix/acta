# Acta — Updated MVP Plan

> TypeScript-first docs-as-code инструмент для управления ADR и spec-документами в Git-репозитории. Source of truth остается Markdown + YAML frontmatter; tooling строится вокруг строгой модели данных, CLI, статического viewer, графа связей, поиска и CI-валидации.

---

## 1. Архитектурный вывод

Исходный `MVP_PLAN.md` уже хорошо держит главный принцип: это не wiki-платформа и не база знаний с собственным storage, а надежный слой поверх Markdown в Git. Это правильная граница для MVP.

Что стоит усилить перед реализацией:

- Разделить **core data pipeline** и **presentation pipeline**. CLI, web viewer, CI и будущий MCP должны читать одни и те же normalized artifacts, а не каждый по-своему парсить Markdown.
- Сделать `packages/core` полностью независимым от Astro, React, CLI и Node-specific UX. Core должен быть библиотекой: parse, index, validate, graph, search documents.
- Не полагаться на Astro Content Collections как на единственный parser. Astro хорош для viewer, но source of truth для правил должен быть core. Content Collections можно использовать как web integration layer.
- Сразу зафиксировать публичный формат build artifacts: `documents.json`, `graph.json`, `search-index.json`, `validation.json`. Это упростит web, CI, MCP и интеграции.
- Добавить explicit decision log для самого проекта с первого дня. Acta должен dogfood себя, иначе легко потерять фокус на реальном UX автора документов.

---

## 2. Обновленный стек

| Слой | Рекомендация | Комментарий |
|---|---|---|
| Язык | TypeScript | Правильно для CLI, web и будущего MCP. |
| Runtime | Node 24 LTS для разработки, `engines >=22.12 <26` на старте | На 2026-04-26 Node 24 уже Active LTS, Node 22 все еще поддерживается. Для нового проекта лучше целиться в 24, но не ломать пользователей на 22 без причины. |
| Package manager | pnpm workspaces | Хороший выбор. |
| Build orchestration | Turborepo или pnpm scripts only | Turbo оправдан, если пакетов сразу несколько. Если MVP совсем маленький, можно начать без Turbo и добавить позже. |
| Bundling libs/CLI | tsup | Хороший pragmatic default. |
| Lint/format | Biome | Хороший выбор для скорости и простоты. |
| Tests | Vitest | Хорошо подходит для ESM/TS. |
| Schema | Zod v4 | Оставить single source of truth в `@acta/core/schema`. |
| Markdown | unified/remark pipeline | Правильно. Лучше не смешивать `gray-matter` и remark-frontmatter без необходимости. |
| YAML | yaml package через remark-frontmatter payload | Нужна предсказуемая обработка дат, массивов и ошибок. |
| Web | Astro 6 или текущий stable Astro на момент bootstrap | Идея Astro верная: static-first, islands only where needed. |
| UI islands | React only for graph/search | Не превращать viewer в SPA. |
| Graph | React Flow в web, pure graph model в core | Core не должен знать о React Flow. |
| Search | Orama в MVP | Достаточно для локального статического поиска. Индекс генерировать на build. |
| CLI | citty или clipanion | `citty` ок, но до начала реализации стоит проверить publish/bin/ESM ergonomics. |
| Hooks | lefthook | Хорошо, но install hook должен быть opt-in. |

### Версионная поправка

В исходном плане указаны Node 22 LTS и Astro 5. Для нового старта в апреле 2026 я бы обновил baseline:

- `Node 24 LTS` как рекомендуемый runtime.
- `Node 22` поддерживать, если это не усложнит код.
- `Astro 6` или актуальный stable на момент bootstrap.
- В `package.json` зафиксировать `packageManager`, `engines`, `type: "module"`.

---

## 3. Продуктовые границы MVP

### MVP должен уметь

- Инициализировать docs structure в существующем репозитории.
- Создавать ADR/spec из шаблонов.
- Валидировать frontmatter, lifecycle, links, обязательные секции и graph invariants.
- Строить normalized index документов.
- Экспортировать machine-readable artifacts.
- Показывать read-only static viewer.
- Давать быстрый поиск по title, summary, tags, body.
- Работать в CI и pre-commit.

### MVP не должен уметь

- Редактировать документы через web.
- Синхронизироваться с внешней базой.
- Авторизовывать пользователей.
- Генерировать ADR через AI.
- Быть полноценным knowledge graph product.
- Поддерживать все Markdown edge cases.
- Иметь MCP server до стабилизации core artifacts.

---

## 4. Монорепо

```txt
acta/
├── apps/
│   └── web/
│       ├── src/
│       └── astro.config.mjs
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── schema.ts
│   │   │   ├── config.ts
│   │   │   ├── parser.ts
│   │   │   ├── repository.ts
│   │   │   ├── validator.ts
│   │   │   ├── graph.ts
│   │   │   ├── artifacts.ts
│   │   │   ├── search.ts
│   │   │   └── cache.ts
│   │   └── test/
│   ├── cli/
│   │   └── src/
│   ├── renderer/
│   │   └── src/
│   └── mcp-server/
│       └── README.md
├── docs/
│   ├── decisions/
│   ├── specs/
│   └── templates/
├── acta.config.ts
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── biome.json
└── tsconfig.base.json
```

### Package boundaries

`@acta/core`:

- Не зависит от Astro, React, citty, terminal UI.
- Может зависеть от Zod, unified/remark, yaml, fast-glob, Orama only if search index generation lives here.
- Экспортирует typed API для CLI, web build adapter и будущего MCP.

`@acta/cli`:

- Тонкий слой над core.
- Отвечает за args, вывод в терминал, exit codes, scaffolding, watch mode.
- Не содержит собственных validation rules.

`@acta/renderer`:

- Markdown-to-HTML и terminal rendering helpers.
- Shiki theme handling.
- Может быть использован CLI `show` и web build pipeline.

`apps/web`:

- Статический viewer.
- Читает build artifacts.
- React islands только для интерактивного graph/search.
- Не должен повторно реализовывать parser/validator.

---

## 5. Core pipeline

Рекомендуемый pipeline:

```txt
load config
  -> scan files
  -> parse markdown/frontmatter
  -> normalize document model
  -> validate schema
  -> validate repository rules
  -> derive backlinks
  -> build graph
  -> build dependency ordering
  -> build search index
  -> write artifacts
```

### Почему artifacts важны

Artifacts дают единый contract между всеми consumers:

- CLI `list/show/graph` может работать через in-memory index или уже построенные artifacts.
- Web viewer становится простым static app.
- CI может публиковать `validation.json`.
- MCP server в Phase 2 сможет читать те же artifacts без повторной архитектуры.

### Минимальные artifacts

```txt
.acta/
├── cache/
│   └── content-cache.json
└── dist/
    ├── documents.json
    ├── graph.json
    ├── ordering.json
    ├── search-index.json
    ├── validation.json
    └── manifest.json
```

`manifest.json` должен включать:

- schema version
- tool version
- build timestamp
- config hash
- document count
- warning/error count

---

## 6. Document model

### ID strategy

Оставить простую человекочитаемую схему:

- `ADR-0001`
- `SPEC-0001`

Но добавить валидационные правила:

- prefix обязан соответствовать `kind`
- numeric part fixed-width, configurable width default `4`
- duplicate numeric IDs между kind допустимы, full `id` должен быть globally unique
- filename должен включать id и slug: `ADR-0001-use-markdown-frontmatter.md`

### Frontmatter

```ts
type DocumentKind = "adr" | "spec";

interface BaseFrontmatter {
  id: string;
  kind: DocumentKind;
  title: string;
  status: string;
  date: string;
  updated?: string;
  tags?: string[];
  component?: string[];
  owners?: string[];
  summary?: string;
  links?: DocumentLinkSet;
}
```

Рекомендация: сделать `tags`, `component`, `owners`, `links` optional во frontmatter, но normalize их в пустые массивы в core. Это снижает шум в новых документах и сохраняет строгую internal model.

### ADR lifecycle

```ts
type AdrStatus =
  | "proposed"
  | "accepted"
  | "rejected"
  | "deprecated"
  | "superseded";
```

### Spec lifecycle

```ts
type SpecStatus =
  | "draft"
  | "active"
  | "paused"
  | "implemented"
  | "obsolete";
```

### Links

```ts
interface DocumentLinkSet {
  related?: string[];
  supersedes?: string[];
  replacedBy?: string[];
  decidedBy?: string[];
  dependsOn?: string[];
  validates?: string[];
  references?: string[];
}
```

Важно: `references` должен быть только для external URLs. Внутренние документы всегда идут через typed links.

---

## 7. Validation rules

### Errors

- Invalid frontmatter schema.
- Unknown `kind`.
- Invalid `status` for `kind`.
- Duplicate `id`.
- `id` prefix does not match `kind`.
- Broken internal links.
- Invalid external URL in `references`.
- Supersession cycle.
- `superseded` without either `replacedBy` or incoming `supersedes`.
- `replacedBy` target does not supersede current document, unless config allows asymmetric links.
- Required sections missing.

### Warnings

- ADR without `# Context`.
- ADR without `# Decision`.
- ADR without `# Consequences`.
- ADR without `# Alternatives`.
- Spec without `# Goals`.
- Spec without `# Requirements`.
- Spec with `implemented` status but no `decidedBy` or `validates`.
- Draft older than configured threshold.
- Accepted ADR with open questions section.
- Orphan document with no incoming or outgoing internal links.
- Owner not listed in configured owners allowlist, if allowlist exists.

### Rule design

Rules should be functions:

```ts
interface ValidationRule {
  id: string;
  severity: "error" | "warning";
  run(context: ValidationContext): ValidationIssue[];
}
```

This makes it easy to add project-specific rules later without changing core engine.

---

## 8. Config

```ts
import { defineConfig } from "@acta/core/config";

export default defineConfig({
  docs: {
    adrDir: "docs/decisions",
    specDir: "docs/specs",
    templatesDir: "docs/templates",
  },
  ids: {
    adrPrefix: "ADR",
    specPrefix: "SPEC",
    width: 4,
  },
  validation: {
    draftMaxAgeDays: 30,
    requiredSections: {
      adr: ["Context", "Decision", "Consequences"],
      spec: ["Summary", "Goals", "Requirements"],
    },
    orphanDocuments: "warning",
    asymmetricSupersedes: "error",
  },
  build: {
    outDir: ".acta/dist",
    cacheDir: ".acta/cache",
  },
});
```

### Config recommendations

- Type config through `defineConfig`.
- Validate config with Zod.
- Resolve paths relative to config file location, not process cwd.
- Support `--config` in CLI.
- Keep defaults strong enough that `acta init` works with minimal config.

---

## 9. CLI commands

### MVP commands

```txt
acta init
acta new adr "Title"
acta new spec "Title"
acta list
acta show ADR-0001
acta validate
acta graph --format json
acta graph --format mermaid
acta build
acta dev
acta renumber ADR-0001 ADR-0007
```

### Exit codes

- `0`: success
- `1`: validation errors or build failure
- `2`: CLI usage error

### Important CLI behavior

- `validate --ci` outputs concise text plus writes `validation.json`.
- `validate --json` prints machine-readable result to stdout.
- `new` should never overwrite existing files.
- `renumber` must update frontmatter, filename and all internal typed links.
- `init` should be idempotent and ask before modifying existing config/templates, unless `--yes`.
- Hooks and GitHub Action installation should be explicit flags: `init --hooks --github-action`.

---

## 10. Web viewer

### Pages

- `/` dashboard: counts, validation summary, searchable document list and newest/dependency sort.
- `/documents` list with filters by kind/status/tag/component/owner.
- `/documents/[id]` document page with metadata, body, outgoing links, backlinks.
- `/graph` interactive graph.
- `/search` search page.

### Web implementation principles

- Viewer reads artifacts generated by `acta build`.
- Static HTML first.
- Minimal client JS.
- Graph interactivity can use small vanilla SVG behavior unless a dedicated graph library becomes necessary.
- Orama loaded only on search page or search island.
- No editing, no auth, no API server in MVP.

### UX details worth adding early

- Broken link warnings visible on document page.
- Superseded/deprecated documents have obvious status banner.
- Backlinks are first-class, not hidden in graph only.
- Copy link to document id.
- Keyboard-friendly search.

---

## 11. Search

MVP search fields:

- `id`
- `title`
- `summary`
- `tags`
- `component`
- `owners`
- `bodyText`

Ranking:

1. exact id
2. title
3. tags/component
4. summary
5. body

Build should emit a compact browser index. If the index becomes too large, Phase 2 can add lazy-loaded index chunks by kind or first letter.

---

## 12. Graph

Core graph should be UI-agnostic:

```ts
interface GraphNode {
  id: string;
  kind: "adr" | "spec";
  status: string;
  title: string;
  tags: string[];
}

interface GraphEdge {
  source: string;
  target: string;
  type: keyof DocumentLinkSet;
}
```

Graph exports:

- JSON for web and MCP.
- Mermaid for README/docs.
- DOT optional, can be Phase 2 unless easy.

Dependency ordering should be a separate core projection over the document graph. It should use causal links (`dependsOn`, `decidedBy`, `validates`, `supersedes`, `replacedBy`) for topological sorting and layout layers, while leaving `related` available for graph display only.

Graph validation:

- Detect supersession cycles.
- Optionally detect dependency cycles.
- Do not treat all cycles as errors; `related` cycles are normal.

---

## 13. Caching and incremental builds

Cache key should include:

- file path
- content hash
- parser version
- schema version
- config hash

Do not over-optimize in Phase 1. Correctness beats clever incremental behavior. A simple cache that avoids reparsing unchanged documents is enough.

Important invalidation cases:

- config changed
- schema version changed
- validation rules changed
- template changed only affects new docs, not existing docs
- renderer changed affects HTML, not document model

---

## 14. Testing strategy

### Core tests

- Valid ADR parse.
- Valid spec parse.
- Invalid status by kind.
- Duplicate ids.
- Broken links.
- Supersedes cycle.
- Backlinks derivation.
- Required section detection.
- Cache invalidation by content hash.
- Config path resolution.

### CLI tests

- `init` creates expected files in temp dir.
- `new adr` creates next id and slug.
- `validate` exit code behavior.
- `renumber` updates references.
- `graph --format mermaid/json`.

### Web tests

- Build renders static pages.
- Document page includes metadata, body, backlinks.
- Graph island receives expected data.
- Search index loads and returns expected hit.

For MVP, Vitest is enough. Browser E2E via Playwright can be added when web UI exists.

---

## 15. CI and release

GitHub Action:

```txt
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
pnpm acta validate --ci
```

Release:

- Use Changesets if publishing multiple packages.
- Publish CLI package with `bin`.
- Keep internal packages private until API stabilizes, unless needed.

Suggested package names:

- `acta` for CLI package if available.
- `@acta/core`
- `@acta/renderer`
- `@acta/web` can remain private app.

---

## 16. Roadmap

### Phase 0 — Bootstrap

- pnpm workspace.
- TypeScript base config.
- Biome.
- Vitest.
- tsup configs.
- Package skeletons.
- Root scripts.
- First dogfooding ADR: `ADR-0001-use-markdown-as-source-of-truth`.

### Phase 1 — Core

- Zod schemas.
- Config loader.
- Markdown parser.
- Repository scanner.
- Normalized document model.
- Validator engine.
- Graph builder.
- Artifact writer.
- Core unit tests.

### Phase 2 — CLI

- `init`.
- `new`.
- `list`.
- `show`.
- `validate`.
- `graph`.
- `build`.
- `renumber`.
- CLI tests with temp fixtures.

### Phase 3 — Web

- Static Astro app.
- Artifact ingestion.
- Dashboard.
- Document list.
- Document page.
- Graph page.
- Search page.
- Basic responsive UI.

### Phase 4 — Dev workflow

- `acta dev`.
- Watch mode.
- Lefthook template.
- GitHub Action template.
- README and demo.

### Phase 5 — Integrations

- MCP server.
- Import from common ADR tools.
- Custom validation rules.
- VS Code extension.
- Larger search backend only if real repos exceed browser search limits.

---

## 17. Main risks

### Risk: Astro duplicates core parsing

Mitigation: web consumes artifacts from core. Astro Content Collections can help with local content ergonomics, but must not become the canonical parser.

### Risk: schema too strict early

Mitigation: strict internal normalization, but optional low-value frontmatter fields. Warnings before errors for process-style rules.

### Risk: graph semantics become vague

Mitigation: keep typed links small and documented. Avoid generic `links: string[]`.

### Risk: CLI grows into business logic

Mitigation: CLI only orchestrates core APIs and formats output.

### Risk: incremental cache causes stale validation

Mitigation: cache only parsed document fragments; always recompute repository-level rules unless proven expensive.

---

## 18. Definition of Done for MVP

- Fresh repo can run `acta init`.
- New ADR/spec can be created from templates.
- Validation catches schema errors, broken links, duplicate IDs and supersession cycles.
- `acta build` produces artifacts and static viewer.
- Viewer shows documents, backlinks, graph and search.
- CI can fail on validation errors.
- The Acta repository uses its own docs format for at least three real documents.
- README explains install, init, authoring, validate, build and publish.

---

## 19. Recommended first implementation slice

Do not start with Astro. Start with core and fixtures.

First slice:

1. Define schemas and config.
2. Add two fixture documents: one ADR, one spec.
3. Parse and normalize them.
4. Validate links and sections.
5. Emit `documents.json` and `validation.json`.
6. Add CLI `validate`.

This produces value quickly and forces the data model to become real before UI decisions lock in.
