import type { ActaDocument } from "./schema.js";
import { describe, expect, it } from "vitest";
import {
  buildDependencyLayers,
  buildOrderingGraph,
  sortDocumentsByDependency,
} from "./ordering.js";

describe("dependency ordering", () => {
  it("builds directed ordering edges from causal link types only", () => {
    const documents = [
      documentFixture({ id: "ADR-0001" }),
      documentFixture({ id: "ADR-0002", links: links({ replacedBy: ["ADR-0005"] }) }),
      documentFixture({ id: "ADR-0003" }),
      documentFixture({ id: "ADR-0004", links: links({ supersedes: ["ADR-0001"] }) }),
      documentFixture({ id: "ADR-0005" }),
      documentFixture({
        id: "SPEC-0001",
        links: links({
          decidedBy: ["ADR-0003"],
          dependsOn: ["ADR-0001"],
          references: ["https://example.com"],
          related: ["ADR-0002"],
          validates: ["ADR-0004"],
        }),
      }),
    ];

    expect(buildOrderingGraph(documents).edges).toEqual([
      { source: "ADR-0002", target: "ADR-0005", type: "replacedBy" },
      { source: "ADR-0001", target: "ADR-0004", type: "supersedes" },
      { source: "ADR-0003", target: "SPEC-0001", type: "decidedBy" },
      { source: "ADR-0001", target: "SPEC-0001", type: "dependsOn" },
      { source: "ADR-0004", target: "SPEC-0001", type: "validates" },
    ]);
  });

  it("sorts documents topologically and uses newest-first ties", () => {
    const documents = [
      documentFixture({ id: "SPEC-0002", date: "2026-05-03" }),
      documentFixture({
        id: "SPEC-0001",
        date: "2026-05-04",
        links: links({ dependsOn: ["ADR-0001"] }),
      }),
      documentFixture({ id: "ADR-0002", date: "2026-05-02" }),
      documentFixture({ id: "ADR-0001", date: "2026-05-01" }),
    ];

    expect(sortDocumentsByDependency(documents).map((document) => document.id)).toEqual([
      "SPEC-0002",
      "ADR-0002",
      "ADR-0001",
      "SPEC-0001",
    ]);
  });

  it("builds dependency layers from foundational documents to dependents", () => {
    const documents = [
      documentFixture({
        id: "SPEC-0002",
        date: "2026-05-03",
        links: links({ dependsOn: ["SPEC-0001"] }),
      }),
      documentFixture({
        id: "SPEC-0001",
        date: "2026-05-02",
        links: links({ decidedBy: ["ADR-0001"] }),
      }),
      documentFixture({ id: "ADR-0001", date: "2026-05-01" }),
    ];

    expect(buildDependencyLayers(documents).layers).toEqual([
      { index: 0, documentIds: ["ADR-0001"] },
      { index: 1, documentIds: ["SPEC-0001"] },
      { index: 2, documentIds: ["SPEC-0002"] },
    ]);
  });

  it("returns deterministic cycle metadata without throwing", () => {
    const documents = [
      documentFixture({
        id: "ADR-0001",
        date: "2026-05-01",
        links: links({ dependsOn: ["ADR-0002"] }),
      }),
      documentFixture({
        id: "ADR-0002",
        date: "2026-05-02",
        links: links({ dependsOn: ["ADR-0001"] }),
      }),
    ];

    const ordering = buildOrderingGraph(documents);

    expect(ordering.cycles).toEqual([{ documentIds: ["ADR-0001", "ADR-0002"] }]);
    expect(sortDocumentsByDependency(documents).map((document) => document.id)).toEqual([
      "ADR-0002",
      "ADR-0001",
    ]);
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
    links: links(),
    backlinks: links(),
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

function links(overrides: Partial<ActaDocument["links"]> = {}): ActaDocument["links"] {
  return {
    related: [],
    supersedes: [],
    replacedBy: [],
    decidedBy: [],
    dependsOn: [],
    validates: [],
    references: [],
    ...overrides,
  };
}
