# Acta — MVP Plan V3 (Path to Release)

> Продолжение `MVP_PLAN_UPDATED.md`. Phase 0–3 завершены, Phase 4 частично. Этот документ описывает доведение до публикуемой версии: финализация Phase 4, темизация, i18n, документация, релиз.

---

## 1. Текущее состояние

### Сделано

- **Phase 0–3 полностью**: монорепо (pnpm + Turbo + Biome + Vitest), `@acta/core` (schema, parser, repository, validator, graph, ordering, search index, artifacts, cache), `@acta/cli` (`init/new/list/show/validate/graph/build/dev/renumber`), `@acta/renderer`, `apps/web` Astro viewer (dashboard, list, document, graph через React Flow, search через Orama, validation page)
- Lefthook (opt-in), GitHub Actions CI, `.acta/dist/*.json` artifact contract
- Базовая темизация через CSS-переменные + `@media (prefers-color-scheme: dark)` в `apps/web/src/styles/global.css`

### Не сделано (Phase 4+)

- README не описывает CLI с точки зрения пользователя
- Нет переключателя темы и нет single source для дизайн-токенов
- Нет i18n
- Нет demo-публикации на GitHub Pages
- Нет changesets / release-pipeline
- Нет e2e fixture для smoke-теста `acta build`
- CI смешивает unit-tests и dogfooding-валидацию контента в один шаг

---

## 2. Решённые вопросы (clarifications)

1. **i18n scope**: только web. CLI остаётся en. Default locale: `en`. Стартовые языки: `en`, `ru`
2. **Структура locales**: namespace по смыслу (`common`, `sidebar`, `graph`, …) в папке на язык: `apps/web/src/locales/{lang}/{namespace}.json`
3. **Theme default**: `system`. Переключатель явно поддерживает `system / light / dark`. Шрифты и текст-токены вынесены в темы
4. **Demo на Pages**: публиковать сам `adr-book/acta` репо (dogfooding-вьювер на Pages)
5. **README структура**: сначала user-doc (что такое Acta, install, quick start, команды), потом contributor-doc (workspace, dev, тесты, релиз)

---

## 3. Анализ тестов (ответ на вопрос)

Юнит/интеграционные тесты в `packages/*/src/**/*.test.ts` уже используют `mkdtemp` fixtures — это правильно. Они **не** проверяют реальные `docs/`.

Что валидирует «все спеки проекта» — CI-шаг `acta validate` в `.github/workflows/ci.yml`. Это **dogfooding-валидация контента** репо, а не тест кода. Доказывает, что инструмент работает на реальных файлах.

### Изменения

- Разделить CI на jobs: `unit-tests` (Vitest), `dogfood-validate` (own docs), `e2e-smoke` (тест на fixture-репо)
- Добавить `tests/fixtures/demo-repo/` с минимальным набором ADR+SPEC для e2e: `acta init` → `acta new` → `acta validate` → `acta build` → assert artifacts
- Документировать в README/CONTRIBUTING разницу между этими тремя категориями

---

## 4. Roadmap

### Phase 4.5 — Test reorg + e2e fixture (0.5 дня)

- Создать `tests/fixtures/demo-repo/` (2 ADR + 2 SPEC, типовые связи)
- Vitest e2e: `packages/cli/test/e2e.test.ts` — гонит pipeline на fixture, проверяет artifacts
- CI: разнести `unit`, `dogfood-validate`, `e2e-smoke`, `lint`, `typecheck`, `build` по jobs

### Phase 5 — Theming (1.5 дня)

#### 5.1 Дизайн-токены

Структура:

```
apps/web/src/styles/
├── tokens/
│   ├── primitives.css      # raw colors, spacing scale, type scale
│   ├── semantic.css        # --color-bg, --color-text-muted, --space-md...
│   └── typography.css      # --font-sans, --font-mono, --text-body, --text-h1...
├── themes/
│   ├── light.css           # [data-theme="light"] { semantic = primitives }
│   └── dark.css            # [data-theme="dark"]
└── global.css              # reset + base, only consume vars
```

- Перенести **все** хардкод-цвета из `global.css` в semantic vars
- Шрифты в `--font-sans`, `--font-mono`. Type scale: `--text-xs/sm/base/lg/xl/2xl`
- Spacing: `--space-1..--space-12` (4px grid)
- Radius/border/shadow тоже в primitives

#### 5.2 Theme toggle

- React island `<ThemeToggle />` в sidebar: `system | light | dark`
- Persist: `localStorage["acta-theme"]`
- **No-FOUC inline script** в `<head>` `BaseLayout.astro`:
  ```html
  <script is:inline>
    const t = localStorage.getItem('acta-theme') ?? 'system';
    const r = t === 'system'
      ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : t;
    document.documentElement.dataset.theme = r;
    document.documentElement.dataset.themePref = t;
  </script>
  ```
- Удалить `@media (prefers-color-scheme: dark)` блок (теперь через `data-theme`)
- Слушать `matchMedia` change при `pref === "system"`
- Прокинуть тему в Shiki: dual-themes (`light: github-light`, `dark: github-dark`), CSS-vars-based highlighting
- React Flow: подхватить через CSS vars или передать prop

### Phase 6 — i18n (2 дня)

#### 6.1 Стек

- **i18next** + **react-i18next** для islands
- Для `.astro` файлов — тонкая `t(ns, key)` обертка над i18next instance, инициализированной на server при SSR (или statically prerendered per-locale)
- Astro routing через built-in `astro:i18n`: `defaultLocale: "en"`, `locales: ["en", "ru"]`, `routing: { prefixDefaultLocale: false }` → `/`, `/ru/`

#### 6.2 Структура

```
apps/web/src/locales/
├── en/
│   ├── common.json         # generic UI (buttons, labels)
│   ├── sidebar.json
│   ├── dashboard.json
│   ├── documents.json      # list + document page
│   ├── graph.json
│   ├── search.json
│   └── validation.json
└── ru/
    └── (same namespaces)
```

- Loader: `import.meta.glob('./locales/**/*.json', { eager: true })` → собрать в `{ [lang]: { [ns]: {...} } }`
- Использование: `t("sidebar:nav.documents")` или `useTranslation("sidebar")` в React

#### 6.3 LanguageSwitcher

- React island в sidebar
- Persist: `localStorage["acta-locale"]` + cookie `acta-locale` (для SSR-чтения если нужно)
- При смене — `window.location` на соответствующий локализованный route

#### 6.4 Что переводим

- **Все UI-strings**: sidebar nav, page headers, table headers, filter labels, search placeholders, validation severity labels, empty states, graph legend, button labels
- **Не переводим**: id документов, title/summary/body документов, статусы (`accepted`, `draft` — это data, не UI), tag/component/owner значения
- Frontmatter labels (`Status:`, `Tags:`, `Date:`) — переводим (это UI вокруг данных)

#### 6.5 Документы — будущее

Документы остаются на языке оригинала. Если потом захочется multi-language docs — отдельный feature через `doc.lang` frontmatter поле, не в MVP.

### Phase 7 — README & CLI docs (1 день)

Полная переработка `README.md`. Структура:

```markdown
# Acta

(краткое описание, badge)

## What is Acta

(2-3 параграфа: для кого, зачем, главные фичи)

## Quick start

npm i -g acta
acta init my-docs
cd my-docs
acta new adr "First decision"
acta validate
acta build
acta dev

## Commands

(таблица: команда / описание / основные флаги / пример)

### acta init
### acta new <adr|spec> <title>
### acta list
### acta show <id>
### acta validate
### acta graph
### acta build
### acta dev
### acta renumber <from> <to>

## Configuration

(пример `acta.config.ts`, ссылка на полный reference)

## CI integration

(пример GitHub Action, lefthook)

## Web viewer

(скриншот, ссылка на dogfood demo на Pages)

---

## For contributors

(вниз: workspace, dev setup, tests, release)
```

Дополнительно:
- `docs/cli-reference.md` — полный flag-reference (генерируется или ручной)
- `docs/configuration.md` — все поля `acta.config.ts`
- `CONTRIBUTING.md` — workflow, тестовые категории, как добавить validation rule
- `acta --help` синхронизировать с README (citty `meta.description`)

### Phase 8 — Release (1 день)

- **Changesets** setup
- `package.json` для `@acta/cli`: `bin`, `files`, `engines`, `publishConfig.access: "public"`
- Решить публичность `@acta/core`, `@acta/renderer` (рекомендация: `@acta/core` публичный — для будущих интеграций; `@acta/renderer` пока приватный)
- `CHANGELOG.md` через changesets
- **GitHub Pages deploy**: workflow `deploy-pages.yml` — на push в main, `pnpm --filter @acta/web build`, deploy `apps/web/dist`
  - Astro `site` + `base` сконфигурировать под Pages URL
- Bump version → publish → tag

### Backlog (после релиза, обсуждать отдельно)

- Дизайн/UX правки веб-вьювера (отдельный разговор)
- `acta import` (log4brains, adr-tools, MADR repos)
- MCP server (Phase 5 из UPDATED-плана)
- VS Code extension
- CLI localization (если будет спрос)
- Multi-language docs support (`doc.lang` frontmatter)

---

## 5. Definition of Done (V3)

- README ведёт нового пользователя от `npm install` до работающего сайта
- Все CLI-команды задокументированы с примерами
- Темы: переключатель `system/light/dark` работает без FOUC, все стили через CSS-переменные в `tokens/themes`
- i18n: `en` (default) и `ru`, namespace-структура, переключатель в sidebar, все UI-strings локализованы
- Demo-сайт self-hosted на Pages из own dogfooding-документов
- CI: разнесённые jobs (unit / e2e / dogfood-validate / lint / typecheck / build)
- `acta` опубликован в npm с рабочим `bin`
- Changesets настроен, CHANGELOG ведётся

---

## 6. Порядок исполнения

```
4.5 test reorg + e2e fixture   (0.5d)
5   theming                     (1.5d)
7   README + docs               (1d)    ← можно параллельно с 5
6   i18n                        (2d)
8   release + pages deploy      (1d)
                                ─────
                                ~6 дней
```

Phase 7 (README) можно начать параллельно с Phase 5, так как они не пересекаются по коду. Phase 6 (i18n) идёт после темизации, чтобы LanguageSwitcher визуально соответствовал ThemeToggle.
