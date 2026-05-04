import type { ActaDocument } from "@acta/core";
import { describe, expect, it } from "vitest";
import {
  buildDocumentHref,
  buildDocumentOrderIndex,
  collectFilterOptions,
  filterDocuments,
  getDocumentSearchText,
  getNextDocumentLimit,
  shouldShowMoreDocuments,
  sortDocumentsByNewest,
} from "./documents.js";

describe("web document utilities", () => {
  it("builds stable document URLs from document IDs", () => {
    expect(buildDocumentHref("ADR-0001")).toBe("/documents/ADR-0001/");
    expect(buildDocumentHref("SPEC 0002")).toBe("/documents/SPEC%200002/");
  });

  it("collects sorted tags, components, statuses, and kinds for filters", () => {
    const options = collectFilterOptions([
      documentFixture({
        id: "ADR-0001",
        kind: "adr",
        status: "accepted",
        tags: ["architecture", "core"],
        component: ["acta-core"],
      }),
      documentFixture({
        id: "SPEC-0001",
        kind: "spec",
        status: "active",
        tags: ["core"],
        component: ["acta-web"],
      }),
    ]);

    expect(options.kinds).toEqual(["adr", "spec"]);
    expect(options.statuses).toEqual(["accepted", "active"]);
    expect(options.tags).toEqual(["architecture", "core"]);
    expect(options.components).toEqual(["acta-core", "acta-web"]);
  });

  it("filters by free text, kind, status, tag, and component", () => {
    const documents = [
      documentFixture({
        id: "ADR-0001",
        title: "Use Markdown as source of truth",
        kind: "adr",
        status: "accepted",
        tags: ["source"],
        component: ["acta-core"],
        body: "Markdown files stay in Git.",
      }),
      documentFixture({
        id: "SPEC-0004",
        title: "Acta web viewer",
        kind: "spec",
        status: "active",
        tags: ["web"],
        component: ["acta-web"],
        body: "Static Astro interface for documents.",
      }),
    ];

    expect(
      filterDocuments(documents, {
        query: "astro",
        kind: "spec",
        status: "active",
        tag: "web",
        component: "acta-web",
      }).map((document) => document.id),
    ).toEqual(["SPEC-0004"]);
  });

  it("sorts newest documents first and uses descending IDs for matching dates", () => {
    const documents = [
      documentFixture({ id: "SPEC-0001", date: "2026-04-26" }),
      documentFixture({ id: "SPEC-0002", date: "2026-04-26" }),
      documentFixture({ id: "ADR-0004", date: "2026-05-01" }),
      documentFixture({ id: "SPEC-0004", date: "2026-05-01" }),
    ];

    expect(sortDocumentsByNewest(documents).map((document) => document.id)).toEqual([
      "SPEC-0004",
      "ADR-0004",
      "SPEC-0002",
      "SPEC-0001",
    ]);
  });

  it("builds document order indexes for client-side sorting", () => {
    const documents = [
      documentFixture({ id: "SPEC-0001", date: "2026-04-26" }),
      documentFixture({ id: "ADR-0004", date: "2026-05-01" }),
      documentFixture({ id: "SPEC-0004", date: "2026-05-01" }),
    ];

    expect(buildDocumentOrderIndex(sortDocumentsByNewest(documents))).toEqual({
      "SPEC-0004": 0,
      "ADR-0004": 1,
      "SPEC-0001": 2,
    });
  });

  it("increments the document list limit without exceeding the matching count", () => {
    expect(getNextDocumentLimit(20, 45)).toBe(40);
    expect(getNextDocumentLimit(40, 45)).toBe(45);
    expect(shouldShowMoreDocuments(45, 40)).toBe(true);
    expect(shouldShowMoreDocuments(45, 45)).toBe(false);
  });

  it("includes metadata and section content in search text", () => {
    const document = documentFixture({
      id: "SPEC-0004",
      summary: "Static document viewer",
      owners: ["Boris"],
      sections: [{ level: 1, title: "Requirements", content: "Client-side filtering" }],
    });

    expect(getDocumentSearchText(document)).toContain("spec-0004");
    expect(getDocumentSearchText(document)).toContain("static document viewer");
    expect(getDocumentSearchText(document)).toContain("boris");
    expect(getDocumentSearchText(document)).toContain("client-side filtering");
  });
});

function documentFixture(overrides: Partial<ActaDocument> = {}): ActaDocument {
  return {
    id: "ADR-0001",
    kind: "adr",
    title: "Use Markdown",
    status: "accepted",
    date: "2026-05-01",
    tags: [],
    component: [],
    owners: [],
    links: {
      related: [],
      supersedes: [],
      replacedBy: [],
      decidedBy: [],
      dependsOn: [],
      validates: [],
      references: [],
    },
    backlinks: {
      related: [],
      supersedes: [],
      replacedBy: [],
      decidedBy: [],
      dependsOn: [],
      validates: [],
      references: [],
    },
    sections: [],
    body: "",
    file: {
      path: "/repo/docs/decisions/ADR-0001-use-markdown.md",
      relativePath: "docs/decisions/ADR-0001-use-markdown.md",
      slug: "ADR-0001-use-markdown",
      contentHash: "hash",
    },
    ...overrides,
  } as ActaDocument;
}
