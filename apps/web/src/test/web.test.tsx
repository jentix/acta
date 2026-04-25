import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import {
  DocumentPage,
  DocumentsPage,
  GraphPage,
  OverviewPage
} from "../App";
import type { AppData } from "../types";

const data: AppData = {
  documents: [
    {
      id: "ADR-0001",
      kind: "adr",
      status: "accepted",
      title: "Use Markdown",
      date: "2026-04-17",
      tags: ["docs"],
      component: ["core"],
      owners: ["Team"],
      summary: "Store docs as Markdown.",
      links: {
        related: ["SPEC-0001"],
        supersedes: [],
        replacedBy: [],
        decidedBy: [],
        dependsOn: [],
        validates: [],
        references: []
      },
      filePath: "docs/decisions/adr-0001.md",
      slug: "use-markdown",
      headings: ["Context", "Decision", "Consequences"],
      html: "<h1>Context</h1><p>Body</p>",
      bodyText: "Context Body",
      backlinks: [{ from: "SPEC-0001", to: "ADR-0001", type: "decidedBy" }],
      issues: []
    },
    {
      id: "SPEC-0001",
      kind: "spec",
      status: "active",
      title: "Model",
      date: "2026-04-17",
      tags: ["model"],
      component: ["core"],
      owners: ["Team"],
      summary: "Model spec.",
      links: {
        related: ["ADR-0001"],
        supersedes: [],
        replacedBy: [],
        decidedBy: ["ADR-0001"],
        dependsOn: [],
        validates: [],
        references: []
      },
      filePath: "docs/specs/spec-0001.md",
      slug: "model",
      headings: ["Summary", "Goals", "Requirements", "Proposed design"],
      html: "<h1>Summary</h1><p>Body</p>",
      bodyText: "Summary Body",
      backlinks: [],
      issues: [{ level: "warning", code: "sample", message: "Demo warning" }]
    }
  ],
  graph: {
    nodes: [
      { id: "ADR-0001", kind: "adr", status: "accepted", title: "Use Markdown", tags: ["docs"] },
      { id: "SPEC-0001", kind: "spec", status: "active", title: "Model", tags: ["model"] }
    ],
    edges: [{ from: "SPEC-0001", to: "ADR-0001", type: "decidedBy" }],
    backlinks: {
      "ADR-0001": [{ from: "SPEC-0001", to: "ADR-0001", type: "decidedBy" }]
    }
  },
  searchIndex: [],
  siteMeta: {
    title: "ADR Book",
    totalDocuments: 2,
    countsByKind: { adr: 1, spec: 1 },
    countsByStatus: { accepted: 1, active: 1 },
    tags: ["docs", "model"],
    components: ["core"]
  }
};

describe("web views", () => {
  it("renders overview and documents page", () => {
    expect(
      renderToStaticMarkup(
        <MemoryRouter>
          <OverviewPage data={data} />
        </MemoryRouter>
      )
    ).toContain("2 documents indexed");
    expect(
      renderToStaticMarkup(
        <MemoryRouter>
          <DocumentsPage data={data} />
        </MemoryRouter>
      )
    ).toContain("Use Markdown");
  });

  it("renders graph and detail page", () => {
    expect(
      renderToStaticMarkup(
        <MemoryRouter>
          <GraphPage data={data} />
        </MemoryRouter>
      )
    ).toContain("react-flow");
    expect(
      renderToStaticMarkup(
        <MemoryRouter initialEntries={["/documents/SPEC-0001"]}>
          <Routes>
            <Route path="/documents/:id" element={<DocumentPage data={data} />} />
          </Routes>
        </MemoryRouter>
      )
    ).toContain("Model");
  });
});
