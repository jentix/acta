import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  actaCorePackage,
  buildArtifacts,
  loadProject,
  resolveConfig,
  validateProject,
} from "./index.js";

describe("@acta/core", () => {
  it("exports the package marker", () => {
    expect(actaCorePackage).toBe("@acta/core");
  });

  it("parses valid ADR and spec documents", async () => {
    await withFixture(async (fixture) => {
      await fixture.writeAdr("ADR-0001-use-core.md", validAdr());
      await fixture.writeSpec("SPEC-0001-core-pipeline.md", validSpec());

      const project = await loadProject({ config: fixture.config });

      expect(project.documents).toHaveLength(2);
      expect(project.documents.map((document) => document.id)).toEqual(["ADR-0001", "SPEC-0001"]);
      expect(project.documents[0].links.related).toEqual(["SPEC-0001"]);
      expect(project.documents[0].sections.map((section) => section.title)).toContain("Decision");
    });
  });

  it("reports invalid status by kind", async () => {
    await withFixture(async (fixture) => {
      await fixture.writeAdr("ADR-0001-invalid-status.md", validAdr({ status: "active" }));

      const project = await loadProject({ config: fixture.config });
      const validation = validateProject(project);

      expect(validation.errors.map((issue) => issue.ruleId)).toContain("frontmatter.schema");
    });
  });

  it("reports duplicate ids", async () => {
    await withFixture(async (fixture) => {
      await fixture.writeAdr("ADR-0001-one.md", validAdr({ title: "One" }));
      await fixture.writeAdr("ADR-0001-two.md", validAdr({ title: "Two" }));

      const validation = validateProject(await loadProject({ config: fixture.config }));

      expect(validation.errors.map((issue) => issue.ruleId)).toContain("id.duplicate");
    });
  });

  it("reports id prefix mismatch", async () => {
    await withFixture(async (fixture) => {
      await fixture.writeAdr("SPEC-0001-wrong-prefix.md", validAdr({ id: "SPEC-0001" }));

      const validation = validateProject(await loadProject({ config: fixture.config }));

      expect(validation.errors.map((issue) => issue.ruleId)).toContain("id.prefix");
    });
  });

  it("reports filename/id mismatch", async () => {
    await withFixture(async (fixture) => {
      await fixture.writeAdr("ADR-0002-wrong-file.md", validAdr());

      const validation = validateProject(await loadProject({ config: fixture.config }));

      expect(validation.errors.map((issue) => issue.ruleId)).toContain("filename.id");
    });
  });

  it("reports broken internal links", async () => {
    await withFixture(async (fixture) => {
      await fixture.writeAdr(
        "ADR-0001-broken-link.md",
        validAdr({ links: "related: [SPEC-9999]" }),
      );

      const validation = validateProject(await loadProject({ config: fixture.config }));

      expect(validation.errors.map((issue) => issue.ruleId)).toContain("links.internal");
    });
  });

  it("reports invalid external reference URLs", async () => {
    await withFixture(async (fixture) => {
      await fixture.writeAdr(
        "ADR-0001-invalid-reference.md",
        validAdr({ links: "references: [not-a-url]" }),
      );

      const validation = validateProject(await loadProject({ config: fixture.config }));

      expect(validation.errors.map((issue) => issue.ruleId)).toContain("links.references");
    });
  });

  it("detects supersedes cycles", async () => {
    await withFixture(async (fixture) => {
      await fixture.writeAdr(
        "ADR-0001-one.md",
        validAdr({ id: "ADR-0001", links: "supersedes: [ADR-0002]" }),
      );
      await fixture.writeAdr(
        "ADR-0002-two.md",
        validAdr({ id: "ADR-0002", links: "supersedes: [ADR-0001]" }),
      );

      const validation = validateProject(await loadProject({ config: fixture.config }));

      expect(validation.errors.map((issue) => issue.ruleId)).toContain("supersedes.cycle");
    });
  });

  it("derives backlinks", async () => {
    await withFixture(async (fixture) => {
      await fixture.writeAdr("ADR-0001-linking.md", validAdr({ links: "related: [SPEC-0001]" }));
      await fixture.writeSpec("SPEC-0001-linked.md", validSpec());

      const project = await loadProject({ config: fixture.config });
      const spec = project.documents.find((document) => document.id === "SPEC-0001");

      expect(spec?.backlinks.related).toEqual(["ADR-0001"]);
    });
  });

  it("reports required section warnings", async () => {
    await withFixture(async (fixture) => {
      await fixture.writeAdr(
        "ADR-0001-missing-section.md",
        validAdr({ body: "# Context\n\nOnly context." }),
      );

      const validation = validateProject(await loadProject({ config: fixture.config }));

      expect(validation.warnings.map((issue) => issue.ruleId)).toContain("sections.required");
    });
  });

  it("resolves config paths relative to the config file location", async () => {
    await withFixture(async (fixture) => {
      const config = resolveConfig(
        { docs: { adrDir: "custom/adr", specDir: "custom/spec" } },
        { configPath: join(fixture.root, "acta.config.ts") },
      );

      expect(config.resolvedDocs.adrDir).toBe(join(fixture.root, "custom/adr"));
      expect(config.resolvedDocs.specDir).toBe(join(fixture.root, "custom/spec"));
    });
  });

  it("writes artifacts with expected manifest counts", async () => {
    await withFixture(async (fixture) => {
      await fixture.writeAdr("ADR-0001-use-core.md", validAdr());
      await fixture.writeSpec("SPEC-0001-core-pipeline.md", validSpec());

      const result = await buildArtifacts({ config: fixture.config });
      const manifest = JSON.parse(
        await readFile(join(fixture.root, ".acta/dist/manifest.json"), "utf8"),
      );
      const searchIndex = JSON.parse(
        await readFile(join(fixture.root, ".acta/dist/search-index.json"), "utf8"),
      );
      const ordering = JSON.parse(
        await readFile(join(fixture.root, ".acta/dist/ordering.json"), "utf8"),
      );

      expect(result.manifest.documentCount).toBe(2);
      expect(manifest.documentCount).toBe(2);
      expect(searchIndex).toMatchObject({
        schemaVersion: "1.0.0",
        documents: [
          {
            id: "ADR-0001",
            href: "/documents/ADR-0001/",
            kind: "adr",
            status: "accepted",
            title: "Use core",
            summary: "Test ADR.",
            tags: ["core"],
            components: ["acta-core"],
            owners: ["Boris"],
            sectionsText: expect.any(String),
            bodyText: expect.any(String),
          },
          {
            id: "SPEC-0001",
            href: "/documents/SPEC-0001/",
            kind: "spec",
            status: "active",
            title: "Core pipeline",
            summary: "Test spec.",
            tags: ["core"],
            components: ["acta-core"],
            owners: ["Boris"],
            sectionsText: expect.any(String),
            bodyText: expect.any(String),
          },
        ],
      });
      expect(ordering.documentIds).toEqual(["ADR-0001", "SPEC-0001"]);
    });
  });

  it("updates cache entries when content hashes change", async () => {
    await withFixture(async (fixture) => {
      const path = "ADR-0001-cache.md";
      await fixture.writeAdr(path, validAdr({ title: "Before" }));
      await buildArtifacts({ config: fixture.config });
      const before = JSON.parse(
        await readFile(join(fixture.root, ".acta/cache/content-cache.json"), "utf8"),
      );

      await fixture.writeAdr(path, validAdr({ title: "After" }));
      await buildArtifacts({ config: fixture.config });
      const after = JSON.parse(
        await readFile(join(fixture.root, ".acta/cache/content-cache.json"), "utf8"),
      );

      expect(before.entries[0].contentHash).not.toBe(after.entries[0].contentHash);
    });
  });

  it("loads and validates the repository dogfooding documents", async () => {
    const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
    const project = await loadProject({
      rootDir: repoRoot,
      config: {
        docs: {
          adrDir: "docs/decisions",
          specDir: "docs/specs",
          templatesDir: "docs/templates",
        },
      },
    });
    const validation = validateProject(project);

    expect(project.documents.map((document) => document.id).sort()).toEqual([
      "ADR-0001",
      "ADR-0002",
      "ADR-0003",
      "ADR-0004",
      "SPEC-0001",
      "SPEC-0002",
      "SPEC-0003",
      "SPEC-0004",
      "SPEC-0005",
      "SPEC-0006",
    ]);
    expect(validation.errors).toEqual([]);
  });
});

async function withFixture(
  run: (fixture: {
    root: string;
    config: ReturnType<typeof resolveConfig>;
    writeAdr: (name: string, content: string) => Promise<void>;
    writeSpec: (name: string, content: string) => Promise<void>;
  }) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "acta-core-"));
  const config = resolveConfig(
    {
      docs: {
        adrDir: "docs/decisions",
        specDir: "docs/specs",
        templatesDir: "docs/templates",
      },
      validation: {
        orphanDocuments: "off",
      },
    },
    { rootDir: root },
  );

  try {
    await mkdir(config.resolvedDocs.adrDir, { recursive: true });
    await mkdir(config.resolvedDocs.specDir, { recursive: true });
    await run({
      root,
      config,
      writeAdr: (name, content) =>
        writeFile(join(config.resolvedDocs.adrDir, name), content, "utf8"),
      writeSpec: (name, content) =>
        writeFile(join(config.resolvedDocs.specDir, name), content, "utf8"),
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function validAdr(
  options: { id?: string; title?: string; status?: string; links?: string; body?: string } = {},
): string {
  return `---
id: ${options.id ?? "ADR-0001"}
kind: adr
title: ${options.title ?? "Use core"}
status: ${options.status ?? "accepted"}
date: 2026-04-26
tags: [core]
component: [acta-core]
owners: [Boris]
summary: Test ADR.
links:
  ${options.links ?? "related: [SPEC-0001]"}
---

${
  options.body ??
  `# Context

Context.

# Decision

Decision.

# Consequences

Consequences.

# Alternatives

Alternatives.`
}
`;
}

function validSpec(
  options: { id?: string; title?: string; status?: string; links?: string; body?: string } = {},
): string {
  return `---
id: ${options.id ?? "SPEC-0001"}
kind: spec
title: ${options.title ?? "Core pipeline"}
status: ${options.status ?? "active"}
date: 2026-04-26
tags: [core]
component: [acta-core]
owners: [Boris]
summary: Test spec.
links:
  ${options.links ?? "decidedBy: [ADR-0001]"}
---

${
  options.body ??
  `# Summary

Summary.

# Goals

Goals.

# Requirements

Requirements.`
}
`;
}
