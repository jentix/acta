# Acta — Adoption Plan V4 (Path to Real-World Usage)

> Продолжение `plans/done/MVP_PLAN_V3.md`. Phase 0–8 завершены (кроме npm publish), web-демо опубликовано на GitHub Pages (https://jentix.github.io/acta/). Этот документ описывает доведение до состояния, когда **внешние пользователи применяют Acta в своих репозиториях**: публикация пакетов, машиночитаемый CLI, skill для AI-агентов, автономная сборка/публикация веб-вьювера, MCP-сервер и аутентификация веб-версии.

---

## 1. Центральная проблема

Сегодня вьювер живёт в `apps/web` **внутри этого монорепо**. Пользователь не может запустить веб-версию против своих `docs/` без клонирования монорепо. Это блокирует почти все остальные шаги. Поэтому порядок фаз продиктован зависимостями, а не привлекательностью фич:

```
0. npm publish        ← разблокирует всё (npx acta работает в чужом репо)
1. CLI --json         ← prereq для skill и MCP (агентам нужен надёжный парсинг)
2. Agent skill        ← дёшево, высокая ценность, опирается на (1)
3. acta site + deploy ← decouple вьювера от монорепо (adoption blocker)
4. MCP server         ← опирается на (1), дополняет (2)
5. Web auth (docs)    ← Cloudflare Access, zero-code; SSR — в backlog
```

Решения, зафиксированные с пользователем:
- **Scope**: все 5 фаз, в рекомендованном порядке.
- **Auth**: Cloudflare Access (Zero Trust) — doc-only, без изменений в приложении. In-app SSR-auth — отложенный backlog.

---

## 2. Текущее состояние (вход в V4)

### Сделано (V1–V3)
- Монорепо: pnpm + Turbo + Biome + Vitest
- `@acta-dev/core` — schema, parser, repository, validator, graph, ordering, search index, artifacts, cache
- `@acta-dev/cli` — `init/new/list/show/validate/graph/build/dev/renumber` (citty)
- `@acta-dev/renderer` — Markdown→HTML
- `apps/web` — Astro static viewer: dashboard, list, document, graph (React Flow), search (Orama), validation, theming (tokens + light/dark toggle), i18n (en/ru)
- Lefthook (opt-in), CI (`ci.yml`), GitHub Pages deploy (`deploy-pages.yml`), changesets настроен
- e2e fixture, разнесённые CI jobs

### Не сделано
- **npm publish** — пакеты не опубликованы (единственный незакрытый пункт V3)
- Машиночитаемый вывод CLI (`--json`) — частично/нет
- Никакого способа запустить вьювер вне монорепо
- Нет skill / plugin для агентов
- Нет MCP-сервера
- Нет документации по auth и по публикации web в чужом CI

### Долг, который чистим попутно
- `AGENTS.md:51` и `AGENTS.md:211` ссылаются на старый путь `MVP_PLAN_UPDATED.md` → обновить на `plans/done/` и на этот план.

---

## 3. Версии инструментов (актуальные на 2026-05)

| Инструмент | Версия | Зачем |
|---|---|---|
| `@modelcontextprotocol/sdk` | `^1.29` | MCP-сервер, stdio + Streamable HTTP transport |
| Agent Skills `SKILL.md` | universal standard | Claude Code / Codex / Cursor / Gemini / Copilot — один формат |
| Astro | `6.x` | вьювер; SSR-adapter если когда-нибудь auth in-app |
| Cloudflare Access | Zero Trust | auth перед статикой без кода |
| Better Auth / auth-astro | latest | отложенный SSR-auth (backlog) |

---

## 4. Roadmap

### Phase 0 — npm publish (0.5 дня) — БЛОКЕР

Завершить единственный незакрытый пункт V3. Без этого `npx acta` не работает у пользователя.

- `@acta-dev/cli`: проверить `bin`, `files`, `engines`, `publishConfig.access: "public"`. Точка входа `acta`.
- `@acta-dev/core`: публичный (нужен для `defineConfig` в `acta.config.ts` пользователя и для будущих интеграций).
- `@acta-dev/renderer`: решить — публичный или приватный. Если `core` его импортирует в рантайме у пользователя → публичный. Иначе bundling в `core`/`cli` через tsup `noExternal`.
- Проверить, что `acta.config.ts` пользователя резолвит `@acta-dev/core` (peer/normal dep).
- Прогнать `changeset version` → `changeset publish` (dry-run сначала: `npm publish --dry-run` по каждому пакету).
- Smoke: в **пустой** временной папке `npx acta@latest init && npx acta new adr "Test" && npx acta validate`. Должно работать без монорепо.
- Обновить README Quick Start: убрать «After the CLI is published…» — теперь `npx acta` это реальность.

**Acceptance**: `npx acta init` в чистом репо создаёт config + папки + шаблоны; `validate`/`build` зелёные.

---

### Phase 1 — Machine-readable CLI (`--json`) (0.5 дня) — prereq для 2 и 4

Агенты (skill, MCP) должны парсить вывод надёжно, а не скрейпить human-формат.

- Глобальный флаг `--json` (или авто-детект `!process.stdout.isTTY`) в `packages/cli/src/output.ts`.
- `acta new --json` → `{ "id": "ADR-0007", "path": "docs/decisions/ADR-0007-...md", "kind": "adr" }`.
- `acta validate --json` → `{ "ok": bool, "errorCount": n, "warningCount": n, "issues": [{ severity, code, docId, message, file, line }] }` (переиспользовать `ValidationResult` из core).
- `acta list --json`, `acta show <id> --json`, `acta graph --format json` (уже есть).
- Exit codes контракт документировать: `0` ok, `1` validation errors, `2` usage error.
- Тесты: snapshot JSON-формы для каждой команды (`packages/cli/src/test/json-output.test.ts`).
- Контракт зафиксировать в `docs/cli-reference.md` (раздел «JSON output for tooling/agents»).

**Acceptance**: каждая read/mutate команда отдаёт стабильный JSON; e2e парсит без regex.

---

### Phase 2 — Agent skill + plugin (1 день) — DONE (branch `feat/agent-skill-plugin`)

Цель: AI-агент после реализации задачи сам создаёт нужный документ, наполняет контентом/ссылками, валидирует.

**Решение по синхронизации (ключевое):** skill генерируется из единственного источника правды — экспортов `@acta-dev/core` (`documentKinds`, `adrStatuses`, `specStatuses`, `linkKeys`) + required sections из config + поверхности CLI. Генератор — `renderSkill()` в `packages/cli/src/skill.ts`. Skill версионируется вместе с CLI (бандлится внутрь `@acta-dev/cli`), поэтому версия skill у пользователя всегда == версии его CLI. Дрейф ловит contract-test (`skill-contract.test.ts`): committed-копии байт-в-байт равны `renderSkill()`, и текст содержит каждое значение из core. Регенерация — `pnpm gen:skill`. Подробности — `docs/skill.md`.

#### 2.1 Skill (universal `SKILL.md`) — ✅
- [x] `renderSkill()` в `packages/cli/src/skill.ts` — source of truth, интерполирует данные из core.
- [x] Frontmatter: `name: acta-document`, `description` с триггерами, `allowed-tools: Bash`.
- [x] Тело — процедурный loop (kind → `new --json` → fill frontmatter+sections → `validate --json` fix-loop → `show --json`).
- [x] Данные модели (kinds/statuses/link types/required sections) генерируются из core, не дублируются вручную.
- [x] Committed: `skills/acta-document/SKILL.md` (+ копия в плагине).

#### 2.2 Доставка — ✅
- [x] `acta init --skill` — пишет `.claude/skills/acta-document/SKILL.md` + idempotent-блок (`<!-- acta:skill:start/end -->`) в `AGENTS.md` пользователя.
- [x] Claude Code **plugin**: `plugins/acta/` + marketplace-манифест `.claude-plugin/marketplace.json` (репо = marketplace). Установка задокументирована в `docs/skill.md`.
- [x] `.codex/` — non-Claude агенты получают то же руководство через AGENTS.md-блок.

#### 2.3 Тесты/проверка — ✅
- [x] `skill-contract.test.ts`: байт-равенство committed-копий + contains-all-core-values + валидность frontmatter (YAML).
- [x] Negative-sync: добавление статуса в core без регенерации валит contract-test (проверено).
- [x] Clean-room: `acta init --skill` ставит skill+AGENTS-блок, повторный запуск идемпотентен.
- [x] `lint`/`typecheck`/`format:check`/`test`/`build` — зелёные.

**Acceptance**: `acta init --skill` ставит skill; агент в чистом репо проходит new→fill→validate без вмешательства человека. ✅ (loop-команды покрыты fixture-тестами CLI; доставка проверена clean-room).

**Остаток:** changeset создан (`@acta-dev/cli` minor) — публикация за пользователем. Примечание: резолв `@acta-dev/core` из пользовательского `acta.config.ts` в не-установленном окружении — отдельная adoption-проблема (Phase 0/3), не Phase 2.

---

### Phase 3 — `acta site` + deploy (2 дня) — adoption blocker

Цель: пользователь публикует веб-вьювер против своих docs одним флагом + коммитом, без монорепо.

#### 3.1 Decouple вьювера
Проблема: `apps/web` сейчас читает локальные `.acta/dist`. Нужно сделать вьювер consumable вне монорепо.

Варианты (выбрать на этапе реализации, измеряя сложность):
- **A — prebuilt viewer как dependency**: собрать Astro-вьювер, опубликовать как `@acta-dev/web` (или `@acta-dev/viewer`); `acta site` берёт собранный шаблон, инжектит `.acta/dist` пользователя, выдаёт `.acta/site/`.
- **B — generator**: `acta site` рендерит статику из artifacts напрямую (вьювер как библиотека компонентов). Больше контроля, больше работы.
- Рекомендация: **A** — переиспользует уже готовый `apps/web`, минимум нового кода. Вьювер читает artifacts через env/манифест, а не из фиксированного relative-path.

**Связка с renderer (важно):** `apps/web` — единственный, кто зависит от `@acta-dev/renderer`; core/cli его не импортят, поэтому в Phase 0 он остаётся `private`. Но как только вьювер выходит наружу, его зависимость на `@acta-dev/renderer` должна резолвиться у пользователя. Два пути:
- **Bundle**: собрать вьювер с `noExternal: ["@acta-dev/renderer", "@acta-dev/core"]` (tsup/astro) → renderer запекается в артефакт вьювера, остаётся `private`. Предпочтительно.
- **Publish**: снять `private` с `@acta-dev/renderer`, убрать из `.changeset/ignore`, публиковать как public dep. Больше surface, версионирование.
- Решение принять на старте Phase 3; по умолчанию — bundle.

#### 3.2 Команда
- `acta site` (или `acta build --site`): `acta build` (artifacts) → инжект в вьювер → статика в `.acta/site/` (configurable `--out`).
- `acta dev` уже есть для локального preview — выровнять, чтобы dev и site читали один источник.
- `site` пробрасывает `base` (для project-pages вроде `/<repo>/`), `site` URL, тему/локаль из `acta.config.ts`.

#### 3.3 Deploy workflows
- `acta init --deploy=pages|cloudflare|vercel|netlify` пишет готовый workflow в `.github/workflows/`:
  - `pages`: build → `acta site` → upload `.acta/site` → `actions/deploy-pages`.
  - `cloudflare`/`vercel`/`netlify`: build → `acta site` → их deploy-action.
- Workflow ставит `acta` через `npx`/`pnpm dlx` (Phase 0).
- Документировать в README раздел «Publish the web viewer in your own CI» + `docs/deploy.md`.

**Acceptance**: в чистом репо `acta init --deploy=pages`, push в main → GitHub Pages показывает вьювер с docs пользователя. Без клонирования acta-монорепо.

---

### Phase 4 — MCP server (1.5 дня)

Цель: агенты в любом MCP-клиенте используют Acta как структурированные tools (дополняет skill).

- Новый пакет `packages/mcp-server`, bin `acta-mcp`. Тонкий слой над `@acta-dev/core` (как CLI).
- `@modelcontextprotocol/sdk@^1.29`.
- **Transports**: stdio (локальные агенты, дефолт) + Streamable HTTP (`--http --port`, для команд/remote).
- **Tools**:
  - `acta_new` (kind, title) → id+path
  - `acta_validate` → ValidationResult
  - `acta_list` (фильтры kind/status/tag)
  - `acta_show` (id) → metadata+links+backlinks
  - `acta_graph` (format)
  - `acta_search` (query) — поверх Orama index
  - `acta_build` → manifest counts
- **Resources**: документы как `acta://doc/ADR-0001` (read), список как `acta://docs`.
- Schema всех tools — Zod (переиспользовать схемы core).
- Регистрация: `acta init --mcp` пишет `.mcp.json` пользователю (`command: npx acta-mcp`).
- Тесты: in-memory client из SDK гоняет каждый tool против fixture-репо.
- Документировать в `docs/mcp.md`: подключение к Claude Code/Desktop/Cursor.

**Acceptance**: MCP-клиент видит tools, создаёт+валидирует документ end-to-end; HTTP-режим отвечает на той же логике.

---

### Phase 5 — Web auth: Cloudflare Access (doc-only) (0.5 дня)

Цель: команды закрывают доступ к веб-вьюверу (Google login / allowlist) без изменений в приложении.

- Статический сайт = нет нативного auth. Решение: **Cloudflare Access (Zero Trust)** перед статикой.
- `docs/auth.md`:
  - Pages/Tunnel + Access Application, policy (Google IdP / email allowlist / OTP).
  - Вариант для GitHub Pages: проксировать через Cloudflare (custom domain) и поставить Access перед ним.
  - Бесплатный tier лимиты, типовая policy.
- README: ссылка «Restricting access to the viewer».
- **Без кода в приложении.**

**Acceptance**: документированный путь, по которому вьювер за Google-login открывается только разрешённым.

---

## 5. Backlog (после V4, обсуждать отдельно)

- **In-app SSR auth**: Astro 6 SSR-adapter + Better Auth / auth-astro (basic + Google) для self-host без Cloudflare. Не pure-static → отдельная сборка/режим.
- `acta import` (log4brains, adr-tools, MADR).
- VS Code extension.
- CLI localization.
- Multi-language docs (`doc.lang`).
- Orama 3 upgrade + search scalability (перенесено из V3 backlog, если не закрыто).
- Marketplace listing для plugin (verified).

---

## 6. Порядок исполнения

```
0  npm publish              (0.5d)  ← блокер, первым
1  CLI --json               (0.5d)  ← prereq для 2 и 4
2  Agent skill + plugin     (1d)
3  acta site + deploy       (2d)    ← можно параллельно с 2 после 0
4  MCP server               (1.5d)  ← после 1
5  Web auth docs            (0.5d)  ← независимо, в любой момент
                            ──────
                            ~6 дней
```

- Phase 0 строго первым — иначе ничего не доходит до пользователя.
- Phase 1 перед 2 и 4 — обе зависят от `--json`.
- Phase 3 можно вести параллельно с 2 (разные части кодовой базы).
- Phase 5 не зависит ни от чего (чистая документация).

---

## 7. Definition of Done (V4)

- `npx acta init` поднимает Acta в любом чужом репо без монорепо
- Все mutate/read команды CLI имеют стабильный `--json` контракт, задокументированный
- `acta init --skill` ставит universal SKILL.md; агент проходит new→fill→validate автономно; есть Claude Code plugin
- `acta site` собирает деплоибельную статику из пользовательских docs; `acta init --deploy=...` пишет рабочий CI workflow; web публикуется в чужом CI одним флагом
- `acta-mcp` отдаёт tools+resources по stdio и Streamable HTTP; задокументировано подключение
- Документирован Cloudflare Access путь для закрытия доступа к вьюверу
- `AGENTS.md` ссылки на планы обновлены
