# demo-repo fixture

Static fixture used by the e2e smoke test (`packages/cli/src/test/e2e.test.ts`).

Contents:

- `acta.config.ts` — minimal config matching `defineConfig` defaults
- `docs/templates/{adr,spec}.md` — bundled templates
- `docs/decisions/ADR-0001..ADR-0002` — two ADRs with typed links
- `docs/specs/SPEC-0001..SPEC-0002` — two specs that depend on the ADRs

This fixture is not scanned by `acta validate` in the host repo because
`tests/fixtures/` is outside the configured `docs/decisions` and `docs/specs`
directories. Tests load it explicitly via `loadProject({ rootDir })`.

The fixture is read-only at rest. Tests that need to mutate it should copy it
into a tmpdir first.
