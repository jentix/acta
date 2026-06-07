import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveConfig } from "@acta-dev/core";
import { describe, expect, it } from "vitest";
import {
  type ActaMcpContext,
  actaBuild,
  actaList,
  actaNew,
  actaSearch,
  actaShow,
  actaValidate,
} from "./tools.js";

describe("Acta MCP tool handlers", () => {
  it("lists documents with metadata filters", async () => {
    await withFixture(async (context) => {
      const specs = await actaList(context, {
        kind: "spec",
        status: "active",
        tag: "api",
        component: "acta-core",
        owner: "Ada",
      });

      expect(specs).toEqual([
        expect.objectContaining({
          id: "SPEC-0001",
          kind: "spec",
          status: "active",
          title: "Storage API",
        }),
      ]);
    });
  });

  it("shows one document with backlinks and returns a structured not-found error", async () => {
    await withFixture(async (context) => {
      await expect(actaShow(context, { id: "ADR-0001" })).resolves.toMatchObject({
        id: "ADR-0001",
        backlinks: {
          decidedBy: ["SPEC-0001"],
        },
      });

      await expect(actaShow(context, { id: "ADR-9999" })).rejects.toMatchObject({
        code: "ACTA_NOT_FOUND",
        details: { id: "ADR-9999" },
      });
    });
  });

  it("validates and builds with manifest counts", async () => {
    await withFixture(async (context) => {
      await expect(actaValidate(context)).resolves.toMatchObject({
        ok: true,
        errorCount: 0,
        warningCount: 0,
      });

      const result = await actaBuild(context);

      expect(result).toMatchObject({
        manifest: {
          documentCount: 2,
          errorCount: 0,
          warningCount: 0,
        },
        validation: {
          ok: true,
        },
      });
      await expect(
        readFile(join(context.rootDir, ".acta/dist/manifest.json"), "utf8"),
      ).resolves.toContain('"documentCount": 2');
    });
  });

  it("searches metadata and optional full content", async () => {
    await withFixture(async (context) => {
      await expect(
        actaSearch(context, { query: "API", includeContent: false }),
      ).resolves.toMatchObject([{ id: "SPEC-0001" }]);
      await expect(
        actaSearch(context, { query: "body-only phrase", includeContent: false }),
      ).resolves.toEqual([]);
      await expect(
        actaSearch(context, { query: "body-only phrase", includeContent: true }),
      ).resolves.toMatchObject([{ id: "ADR-0001" }]);
    });
  });

  it("creates a new document and makes it visible to validation and show", async () => {
    await withFixture(async (context) => {
      const created = await actaNew(context, {
        kind: "spec",
        title: "FastMCP Integration",
        tags: ["mcp", "agents"],
      });

      expect(created).toMatchObject({
        id: "SPEC-0002",
        kind: "spec",
        title: "FastMCP Integration",
        status: "draft",
        relativePath: "docs/specs/SPEC-0002-fastmcp-integration.md",
      });
      await expect(actaValidate(context)).resolves.toMatchObject({ ok: true });
      await expect(actaShow(context, { id: created.id })).resolves.toMatchObject({
        id: "SPEC-0002",
        tags: ["mcp", "agents"],
      });
    });
  });
});

async function withFixture(test: (context: ActaMcpContext) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "acta-mcp-test-"));
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
    await mkdir(config.resolvedDocs.templatesDir, { recursive: true });
    await writeFile(join(config.resolvedDocs.templatesDir, "adr.md"), adrTemplate(), "utf8");
    await writeFile(join(config.resolvedDocs.templatesDir, "spec.md"), specTemplate(), "utf8");
    await writeFile(join(config.resolvedDocs.adrDir, "ADR-0001-record-storage.md"), adr(), "utf8");
    await writeFile(join(config.resolvedDocs.specDir, "SPEC-0001-storage-api.md"), spec(), "utf8");

    await test({ rootDir: root, config });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function adrTemplate(): string {
  return `---
id: ADR-0000
kind: adr
title: Template ADR
status: proposed
date: YYYY-MM-DD
tags: []
component: []
owners: []
summary: Short summary.
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

Context.

# Decision

Decision.

# Consequences

Consequences.

# Alternatives

Alternatives.
`;
}

function specTemplate(): string {
  return `---
id: SPEC-0000
kind: spec
title: Template Spec
status: draft
date: YYYY-MM-DD
tags: []
component: []
owners: []
summary: Short summary.
links:
  related: []
  decidedBy: []
  dependsOn: []
  validates: []
  references: []
---

# Summary

Summary.

# Goals

Goals.

# Requirements

Requirements.
`;
}

function adr(): string {
  return `---
id: ADR-0001
kind: adr
title: Record storage
status: accepted
date: 2026-06-01T00:00:00.000Z
tags: [storage]
component: [acta-core]
owners: [Ada]
summary: Storage decision.
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

Storage context with body-only phrase.

# Decision

Use Markdown files.

# Consequences

Simple Git storage.

# Alternatives

Database-backed storage.
`;
}

function spec(): string {
  return `---
id: SPEC-0001
kind: spec
title: Storage API
status: active
date: 2026-06-02T00:00:00.000Z
tags: [api]
component: [acta-core]
owners: [Ada]
summary: Storage API spec.
links:
  related: []
  decidedBy: [ADR-0001]
  dependsOn: []
  validates: []
  references: []
---

# Summary

Storage API summary.

# Goals

Read and write records.

# Requirements

Expose stable document operations.
`;
}
