import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveConfig } from "@acta-dev/core";
import { describe, expect, it } from "vitest";
import { listDocsResource, readDocResource } from "./resources.js";
import type { ActaMcpContext } from "./tools.js";

describe("Acta MCP resources", () => {
  it("loads the document list and individual documents as JSON resources", async () => {
    await withFixture(async (context) => {
      const docs = await listDocsResource(context);
      const parsedDocs = JSON.parse(resourceText(docs));

      expect(docs).toMatchObject({
        uri: "acta://docs",
        mimeType: "application/json",
      });
      expect(parsedDocs).toEqual([
        expect.objectContaining({ id: "ADR-0001", title: "Use Markdown" }),
      ]);

      const doc = await readDocResource(context, { id: "ADR-0001" });
      const parsedDoc = JSON.parse(resourceText(doc));

      expect(doc).toMatchObject({
        uri: "acta://doc/ADR-0001",
        mimeType: "application/json",
      });
      expect(parsedDoc).toMatchObject({ id: "ADR-0001", kind: "adr" });
    });
  });

  it("returns structured not-found errors for missing document resources", async () => {
    await withFixture(async (context) => {
      await expect(readDocResource(context, { id: "ADR-9999" })).rejects.toMatchObject({
        code: "ACTA_NOT_FOUND",
        details: { id: "ADR-9999" },
      });
    });
  });
});

async function withFixture(test: (context: ActaMcpContext) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "acta-mcp-resource-test-"));
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
    await writeFile(join(config.resolvedDocs.adrDir, "ADR-0001-use-markdown.md"), adr(), "utf8");

    await test({ rootDir: root, config });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function resourceText(resource: Awaited<ReturnType<typeof listDocsResource>>): string {
  if ("text" in resource) {
    return resource.text;
  }
  throw new Error("Expected text resource.");
}

function adr(): string {
  return `---
id: ADR-0001
kind: adr
title: Use Markdown
status: accepted
date: 2026-06-01T00:00:00.000Z
tags: [docs]
component: [acta-core]
owners: [Ada]
summary: Markdown docs.
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
