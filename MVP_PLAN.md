# Acta — Optimized MVP Plan

> TypeScript-first docs-as-code инструмент для управления ADR и spec-документами в репозитории. CLI + статический web-viewer с графом связей и поиском.

---

## Контекст

Acta хранит архитектурные решения (ADR) и живые технические спецификации (spec) как Markdown-файлы рядом с кодом, добавляет строгую модель данных, typed links между документами, валидацию и удобный read-only веб-интерфейс. Цель — чтобы команда **и** coding-агенты могли быстро понять, какие решения приняты, почему, какие актуальны, и как они связаны со спеками.

MVP — это **надёжный слой поверх Markdown**, не «wiki-платформа». Документы остаются source of truth, всё инструментирование строится вокруг них.

---

## Что включено в MVP

- Хранение `adr` и `spec` как Markdown + YAML frontmatter
- Строгая Zod-схема документа с раздельными lifecycle для ADR и spec
- Typed links между документами с проверкой целостности
- CLI: `init / new / list / show / validate / graph / build / dev / renumber`
- Статический web viewer: list, document page, граф, search
- Incremental builds с content hashing
- Pre-commit hook + GitHub Action для CI

## Что НЕ в MVP

- Web-editing документов
- Совместное редактирование, auth/roles
- AI auto-writing
- База данных как основной storage (Git — единственный version store)
- MCP server (Phase 2)
- Ink TUI (Phase 2)
- Rust/Tantivy search backend (Phase 2, только при необходимости)

---

## Стек

| Слой | Технология | Почему |
|------|------------|--------|
| Язык | TypeScript 5.6+ | Основной стек разработчика |
| Runtime | Node 22 LTS | Стабильность, ESM-нативность |
| Monorepo | pnpm workspaces + Turborepo | Стандарт 2026, incremental builds |
| Bundling (libs) | tsup | esbuild-based, простой DX |
| Lint/format | Biome | Один бинарник, в 10–100× быстрее ESLint+Prettier |
| Tests | Vitest | ESM-нативный, общий конфиг с Vite/Astro |
| Schema/validation | Zod v4 | Discriminated unions для kind/status, runtime + types |
| Markdown pipeline | unified + remark + remark-frontmatter + remark-gfm + remark-rehype | Один AST pass, без двойного парсинга |
| Code highlighting | Shiki | VS Code-quality, zero-runtime HTML |
| CLI framework | citty (UnJS) | TS-native, defineCommand, лучше DX чем commander |
| Web viewer | **Astro 5** + Content Collections + React islands | Встроенная Zod-валидация frontmatter, статика по умолчанию, минимальный JS |
| Graph UI | React Flow | Стандарт для interactive node-edge UI |
| Search | Orama | TS-native BM25 + fuzzy, работает в браузере и Node |
| Config | `acta.config.ts` (typed) | `defineConfig` с автокомплитом |
| Pre-commit | lefthook | Быстрее husky, написан на Go |

### Почему именно эти решения (отличия от draft-плана)

1. **Astro вместо «React+Vite SPA или VitePress»** — Astro Content Collections дают встроенную Zod-валидацию frontmatter (это ровно то, что в draft описано как «свой parser layer»). Islands architecture: статика по умолчанию, React только для графа и search.
2. **remark-frontmatter вместо gray-matter** — единый AST pass, без расхождения моделей.
3. **citty вместо commander** — TS-native, declarative subcommands.
4. **Orama вместо «in-memory JSON или phase-2 Tantivy»** — для реалистичных репо (до 10k документов) Orama покрывает всё. Tantivy/napi-rs становится нужен только при экстремальных объёмах.
5. **pnpm + Turborepo** — индустриальный стандарт для TS-монорепо в 2026.
6. **Biome вместо ESLint + Prettier** — один инструмент, в разы быстрее.
7. **Incremental builds + content hashing** — кеш в `.acta/cache/`, быстрый `validate` в pre-commit.
8. **`acta dev` watch mode** — live reload во время написания документов.

---

## Архитектура монорепо

```
acta/
├── apps/
│   └── web/                      # Astro app (docs viewer)
├── packages/
│   ├── core/                     # модели, schemas, parser, graph, validator
│   ├── cli/                      # citty commands → core
│   ├── renderer/                 # md → html (для CLI show вне Astro)
│   └── mcp-server/               # Phase 2
├── docs/
│   ├── decisions/                # сами ADR этого репо (dogfooding)
│   ├── specs/
│   └── templates/
├── acta.config.ts
├── pnpm-workspace.yaml
├── turbo.json
├── biome.json
└── package.json
```

### packages/core

- `schema.ts` — Zod schemas: `AdrDocument`, `SpecDocument`, `LinkSet`, discriminated union по `kind`, lifecycle-specific status enums
- `parser.ts` — `unified()` pipeline → AST → normalized `Document`
- `repo.ts` — scan filesystem, build `Map<DocumentId, Document>`, derive backlinks
- `graph.ts` — adjacency list, cycle detection (DFS), Mermaid + JSON exporters
- `validator.ts` — pluggable rule registry: schema, broken refs, duplicate ids, lifecycle violations, supersede cycles, orphans, missing required sections
- `cache.ts` — content-hash incremental cache
- `config.ts` — `defineConfig`, load + validate

### packages/cli (citty commands)

| Команда | Что делает |
|---------|------------|
| `init` | Scaffold (folders + `acta.config.ts` + templates + lefthook + GHA) |
| `new <adr\|spec>` | Подбирает следующий id, создаёт файл из шаблона, нормализует slug |
| `list [--kind] [--status] [--tag]` | Таблица id / kind / status / title / tags |
| `show <id>` | Метаданные + summary + links + warnings, через Shiki+marked-terminal |
| `validate [--ci]` | Человекочитаемый отчёт + exit code для CI |
| `graph [--format=mermaid\|json\|dot]` | Adjacency data |
| `build` | Generate `documents.json`, `graph.json`, `search-index.json`, static HTML |
| `dev` | Astro dev server + watcher над docs |
| `renumber <id> <newId>` | Safe rename с обновлением всех ссылок |

### apps/web (Astro)

- Content Collections используют **ту же Zod-схему что и core** (импорт из `@acta/core/schema`) — single source of truth
- Routes:
  - `/` — dashboard (counts, recent, warnings)
  - `/documents` — list + filters
  - `/documents/[id]` — full page
  - `/graph` — React Flow island, фильтры
  - `/search` — Orama island
- Static-by-default, dev mode для авторов

---

## Модель данных

### Базовый документ

```ts
interface BaseDocument {
  id: string                     // ADR-0001 / SPEC-0003
  kind: 'adr' | 'spec'
  title: string
  date: string                   // ISO 8601
  tags: string[]
  component?: string[]
  owners?: string[]
  summary?: string
  links: DocumentLinkSet
  // meta (производные, не во frontmatter)
  filePath: string
  body: string
  contentHash: string            // для incremental cache
  warnings: ValidationWarning[]
}

type AdrDocument = BaseDocument & {
  kind: 'adr'
  status: 'proposed' | 'accepted' | 'rejected' | 'deprecated' | 'superseded'
}
type SpecDocument = BaseDocument & {
  kind: 'spec'
  status: 'draft' | 'active' | 'paused' | 'implemented' | 'obsolete'
}
type Document = AdrDocument | SpecDocument
```

Zod discriminated union по `kind` покрывает это нативно — статус валидируется в зависимости от типа документа.

### Typed links

```ts
interface DocumentLinkSet {
  related?: DocumentId[]      // мягкая тематическая связь
  supersedes?: DocumentId[]   // новый документ заменяет старый
  replacedBy?: DocumentId[]   // обратная сторона supersession
  decidedBy?: DocumentId[]    // spec опирается на ADR
  dependsOn?: DocumentId[]    // зависимость по смыслу
  validates?: DocumentId[]    // подтверждает реализацию/проверку
  references?: string[]       // внешние ссылки (URL)
}
```

### Правила валидации

**Хард (блокирующие):**
- `id` уникален во всём репо
- `status` соответствует `kind`
- `supersedes` без циклов
- Все внутренние ссылки резолвятся
- `superseded` ADR имеет `replacedBy` (или referencer через `supersedes`)

**Warnings (не блокирующие):**
- ADR без `# Decision` / `# Consequences`
- Spec со `status: implemented` без `decidedBy` или `validates`
- Draft старше N дней (configurable)
- ADR без `# Alternatives`

---

## Формат документа

### ADR (MADR-подобный)

```markdown
---
id: ADR-0001
kind: adr
title: Use Markdown documents with YAML frontmatter
status: accepted
date: 2026-04-25
tags: [docs, architecture]
component: [acta-core]
owners: [Boris]
summary: Store ADRs and specs as Markdown files with machine-readable metadata.
links:
  related: []
  supersedes: []
  replacedBy: []
  decidedBy: []
  dependsOn: []
  validates: []
  references: []
---
# Context
# Decision
# Consequences
# Alternatives
```

### Spec

```markdown
---
id: SPEC-0001
kind: spec
title: Acta document model
status: active
date: 2026-04-25
tags: [model, docs]
component: [acta-core]
owners: [Boris]
summary: Defines document model, statuses, and relationships.
links:
  related: [ADR-0001]
  decidedBy: [ADR-0001]
  references: []
---
# Summary
# Goals
# Requirements
# Proposed design
# Open questions
```

---

## Roadmap по фазам

### Phase 0 — Bootstrap (≈ 1 день)

- pnpm + Turbo + Biome + Vitest setup
- Workspace skeleton + базовые `tsconfig`
- CI шаблон (GitHub Actions: lint, test, build)
- `docs/decisions/ADR-0001` про сам стек Acta (dogfooding с первого дня)

### Phase 1 — Core (≈ 3–5 дней)

- Zod schemas + discriminated union
- Parser pipeline (remark + frontmatter)
- Repo scanner + index с backlinks
- Graph builder + cycle detection
- Validator engine с pluggable rule registry
- Content-hash cache
- Полное покрытие Vitest

### Phase 2 — CLI (≈ 2–3 дня)

- citty с командами `init / new / list / show / validate / graph`
- Templates (ADR + spec MADR-style)
- Lefthook pre-commit hook
- GitHub Action template

### Phase 3 — Astro web (≈ 3–4 дня)

- Astro app с Content Collections (Zod из core)
- Pages: dashboard, list, document, graph, search
- React Flow island для графа
- Orama island для search
- Shiki theming, dark mode

### Phase 4 — Polish & ship (≈ 1–2 дня)

- `acta dev` (proxy к Astro dev server + watcher)
- `acta build` для static output
- README, docs, npm publish
- Demo repo

### Phase 5+ (после MVP)

- **MCP server** для coding agents — стандартный протокол выдачи ADR/spec корпуса LLM-агентам. Tool-calls: `searchDocs`, `getDocument`, `getGraph`, `validateRefs`. Тривиально поверх существующего core.
- **`acta import`** — миграция из adr-tools / log4brains
- **Ink TUI** — если будет спрос на terminal browsing
- **Rust + napi-rs + Tantivy** — только если Orama упрётся в потолок (вряд ли в обозримом будущем)

---

## Verification (после реализации MVP)

1. `pnpm install && pnpm turbo build` — успешный билд монорепо
2. `pnpm test` — Vitest зелёный (core, cli)
3. `pnpm --filter @acta/cli build && node packages/cli/dist/index.js init demo-repo/` — scaffold работает
4. `cd demo-repo && acta new adr "Use Astro for web viewer"` — создаёт корректный файл
5. `acta validate` — проходит на свежем repo, ловит supersede-cycle если ввести руками
6. `acta dev` — Astro dev server поднимается, документ виден, граф рендерится
7. `acta build` — static output работает (`dist/index.html` открывается)
8. **Dogfooding**: реальный `docs/decisions/` acta репо валидируется и публикуется через GHA на Pages

---

## Следующий шаг

Перейти к **Phase 0 — Bootstrap**: инициализировать pnpm workspace, поставить Turbo/Biome/Vitest, накидать `tsconfig.base.json`, создать пакеты-скелеты `packages/core` и `packages/cli`, настроить GitHub Actions, написать `ADR-0001` про сам стек Acta.
