# Publishing to npm

Acta ships four public packages under the **`@acta-dev`** npm org:

| Package | Purpose | Published |
|---|---|---|
| `@acta-dev/cli` | The `acta` binary | ✅ public |
| `@acta-dev/core` | Pipeline/library used by the CLI | ✅ public |
| `@acta-dev/renderer` | Markdown-to-HTML renderer used by the viewer | ✅ public |
| `@acta-dev/web` | Prebuilt Astro viewer used by `acta site` | ✅ public |

> **Scope note:** the unscoped name `acta` and the org `acta` were both taken on
> npm, so packages live under the org **`acta-dev`**. The recommended project
> install is `npm i -D @acta-dev/cli`, but the **command stays `acta`** (bin
> name is independent of package name).

---

## One-time setup

1. Create/own the npm org `acta-dev` (done).
2. Log in locally:
   ```bash
   npm login
   npm whoami            # confirm logged-in user
   npm org ls acta-dev   # confirm you're a member/owner
   ```
3. Scoped packages default to **private**. All publishable packages already set
   `publishConfig.access = public`, and `.changeset/config.json` has
   `"access": "public"`. No `--access` flag needed, but it's harmless to pass.

---

## Release flow (every release)

Run from the repo root on a clean `main`.

### 1. Build clean

```bash
pnpm install
pnpm -r build
pnpm -r test          # all green before publishing
```

### 2. Create a changeset

```bash
pnpm changeset
```

Pick the bumped packages (`@acta-dev/cli`, `@acta-dev/core`,
`@acta-dev/renderer`, `@acta-dev/web` as applicable), choose patch/minor/major,
and write a summary. This writes a file under `.changeset/`.

### 3. Apply versions

```bash
pnpm changeset version
```

Bumps `package.json` versions, updates internal deps, writes CHANGELOG entries.
Commit the result:

```bash
git add -A
git commit -m "release: version packages"
```

### 4. Publish

```bash
pnpm -r publish --access public
```

`pnpm -r publish`:
- publishes in **topological order** (dependencies before dependents),
- converts `workspace:*` deps into the real published version range,
- skips packages whose version already exists on npm,
- skips `private: true` packages (root only).

### 5. Verify from outside the monorepo

```bash
mkdir /tmp/acta-smoke && cd /tmp/acta-smoke
npm init -y
npm i -D @acta-dev/cli@latest
npx acta init
npx acta new adr "Smoke test"
npx acta validate
npx acta site --serve
```

Use a local dev dependency for the smoke test. `acta.config.ts` imports
`@acta-dev/core`, so the project should have Acta installed locally even when
the `acta` binary is also available globally.

### 6. Push tags + changelog

```bash
git push --follow-tags
```

---

## Troubleshooting

- **`402 Payment Required` / `you must be logged in to publish scoped`** — scope
  is private. Confirm `--access public` and `publishConfig.access`.
- **`404` on `@acta-dev/...`** — org name mismatch. The scope **must equal the
  org you own** (`acta-dev`).
- **`You cannot publish over the previously published versions`** — bump the
  version (step 2–3) first; `pnpm -r publish` skips already-published versions.
- **Wrong dep range published** (`workspace:*` leaked) — always publish via
  `pnpm -r publish`, never `npm publish` per package.
