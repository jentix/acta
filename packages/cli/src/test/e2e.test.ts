import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildArtifacts, loadProject, resolveConfig, validateProject } from "@acta/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Prevent process.exit from killing vitest when commands fail.
vi.spyOn(process, "exit").mockImplementation((code) => {
  throw new Error(`process.exit(${code})`);
});

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const fixtureRoot = join(repoRoot, "tests/fixtures/demo-repo");

const fixtureConfigInput = {
  docs: {
    adrDir: "docs/decisions",
    specDir: "docs/specs",
    templatesDir: "docs/templates",
  },
} as const;

describe("e2e: demo-repo fixture", () => {
  it("loads all four documents from the fixture", async () => {
    const project = await loadProject({ rootDir: fixtureRoot, config: fixtureConfigInput });

    expect(project.documents.map((document) => document.id).sort()).toEqual([
      "ADR-0001",
      "ADR-0002",
      "SPEC-0001",
      "SPEC-0002",
    ]);
  });

  it("validates the fixture without errors", async () => {
    const project = await loadProject({ rootDir: fixtureRoot, config: fixtureConfigInput });
    const validation = validateProject(project);
    expect(validation.errors).toEqual([]);
  });

  it("derives backlinks from typed links in the fixture", async () => {
    const project = await loadProject({ rootDir: fixtureRoot, config: fixtureConfigInput });
    const adr0002 = project.documents.find((document) => document.id === "ADR-0002");
    expect(adr0002?.backlinks.decidedBy).toEqual(["SPEC-0001"]);

    const spec0001 = project.documents.find((document) => document.id === "SPEC-0001");
    expect(spec0001?.backlinks.dependsOn).toEqual(["SPEC-0002"]);

    const adr0001 = project.documents.find((document) => document.id === "ADR-0001");
    expect(adr0001?.backlinks.decidedBy).toEqual(["SPEC-0002"]);
  });

  it("builds artifacts from the fixture", async () => {
    // Build into a tmp dir to avoid mutating the checked-in fixture.
    const root = await mkdtemp(join(tmpdir(), "acta-fixture-build-"));
    try {
      const config = resolveConfig(
        {
          docs: {
            adrDir: join(fixtureRoot, "docs/decisions"),
            specDir: join(fixtureRoot, "docs/specs"),
            templatesDir: join(fixtureRoot, "docs/templates"),
          },
          build: {
            outDir: join(root, ".acta/dist"),
            cacheDir: join(root, ".acta/cache"),
          },
        },
        { rootDir: root },
      );
      const result = await buildArtifacts({ config });

      expect(result.manifest.documentCount).toBe(4);
      expect(result.manifest.errorCount).toBe(0);

      const searchIndex = JSON.parse(
        await readFile(join(root, ".acta/dist/search-index.json"), "utf8"),
      );
      expect(searchIndex.documents).toHaveLength(4);
      expect(searchIndex.schemaVersion).toBe("1.0.0");

      const ordering = JSON.parse(await readFile(join(root, ".acta/dist/ordering.json"), "utf8"));
      // ADR-0002 depends on ADR-0001 via dependsOn; ADR-0001 must precede ADR-0002 topologically.
      expect(ordering.documentIds.indexOf("ADR-0001")).toBeLessThan(
        ordering.documentIds.indexOf("ADR-0002"),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("e2e: init scaffolds an empty repo", () => {
  let root: string;
  let origCwd: () => string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "acta-e2e-init-"));
    origCwd = process.cwd;
    process.cwd = () => root;
  });

  afterEach(async () => {
    process.cwd = origCwd;
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
  });

  it("writes config, doc directories and templates", async () => {
    const { initCommand } = await import("../commands/init.js");
    const initRun = initCommand.run;
    if (!initRun) throw new Error("init command run handler is missing");
    await initRun({
      args: {
        _: [],
        yes: true,
        y: true,
        hooks: false,
        "github-action": false,
        config: undefined,
        c: undefined,
      },
    } as never);

    expect(existsSync(join(root, "acta.config.ts"))).toBe(true);
    expect(existsSync(join(root, "docs/decisions"))).toBe(true);
    expect(existsSync(join(root, "docs/specs"))).toBe(true);
    expect(existsSync(join(root, "docs/templates/adr.md"))).toBe(true);
    expect(existsSync(join(root, "docs/templates/spec.md"))).toBe(true);
  });
});

describe("e2e: new → validate → build flow without config file", () => {
  let root: string;
  let origCwd: () => string;

  beforeEach(async () => {
    // Scaffold a project layout that mirrors `acta init` output but without
    // emitting `acta.config.ts` (which cannot resolve workspace packages from
    // a tmpdir). CLI commands fall back to `resolveConfig` defaults.
    root = await mkdtemp(join(tmpdir(), "acta-e2e-flow-"));
    await mkdir(join(root, "docs/decisions"), { recursive: true });
    await mkdir(join(root, "docs/specs"), { recursive: true });
    await mkdir(join(root, "docs/templates"), { recursive: true });

    const adrTemplate = await readFile(join(fixtureRoot, "docs/templates/adr.md"), "utf8");
    const specTemplate = await readFile(join(fixtureRoot, "docs/templates/spec.md"), "utf8");
    await writeFile(join(root, "docs/templates/adr.md"), adrTemplate, "utf8");
    await writeFile(join(root, "docs/templates/spec.md"), specTemplate, "utf8");

    origCwd = process.cwd;
    process.cwd = () => root;
  });

  afterEach(async () => {
    process.cwd = origCwd;
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
  });

  it("creates ADR/spec, validates and builds artifacts", async () => {
    const { newCommand } = await import("../commands/new.js");
    // @ts-expect-error citty internal
    await newCommand.subCommands.adr.run({
      args: {
        title: "Adopt e2e flow",
        config: undefined,
        id: undefined,
        status: undefined,
        tags: undefined,
      },
    });
    // @ts-expect-error citty internal
    await newCommand.subCommands.spec.run({
      args: {
        title: "End to end flow",
        config: undefined,
        id: undefined,
        status: undefined,
        tags: undefined,
      },
    });

    const config = resolveConfig({}, { rootDir: root });
    const project = await loadProject({ config });
    const validation = validateProject(project);
    expect(validation.errors).toEqual([]);
    expect(project.documents.map((document) => document.id).sort()).toEqual([
      "ADR-0001",
      "SPEC-0001",
    ]);

    for (const document of project.documents) {
      expect(Number.isNaN(Date.parse(document.date))).toBe(false);
      expect(document.date).toMatch(/T\d{2}:\d{2}:\d{2}/);
    }

    const result = await buildArtifacts({ config });
    expect(result.manifest.documentCount).toBe(2);
    expect(result.manifest.errorCount).toBe(0);

    const manifest = JSON.parse(await readFile(join(root, ".acta/dist/manifest.json"), "utf8"));
    expect(manifest.schemaVersion).toBe("1.0.0");
    expect(manifest.documentCount).toBe(2);

    const searchIndex = JSON.parse(
      await readFile(join(root, ".acta/dist/search-index.json"), "utf8"),
    );
    expect(searchIndex.documents).toHaveLength(2);
  });

  it("renumbers an ADR and updates internal references", async () => {
    const { newCommand } = await import("../commands/new.js");
    // @ts-expect-error citty internal
    await newCommand.subCommands.adr.run({
      args: {
        title: "Original decision",
        config: undefined,
        id: undefined,
        status: undefined,
        tags: undefined,
      },
    });

    const { renumberCommand } = await import("../commands/renumber.js");
    const renumberRun = renumberCommand.run;
    if (!renumberRun) throw new Error("renumber command run handler is missing");
    await renumberRun({
      args: { from: "ADR-0001", to: "ADR-0042", "dry-run": false, config: undefined },
    } as never);

    const config = resolveConfig({}, { rootDir: root });
    const project = await loadProject({ config });
    expect(project.documents.map((document) => document.id)).toEqual(["ADR-0042"]);
  });
});
