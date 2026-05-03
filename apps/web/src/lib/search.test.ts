import { describe, expect, it } from "vitest";
import {
  buildSearchUrl,
  getQueryFromUrl,
  removeQueryFromUrl,
  searchDocuments,
  updateQueryInUrl,
  type WebSearchIndexArtifact,
} from "./search.js";

const index: WebSearchIndexArtifact = {
  schemaVersion: "1.0.0",
  documents: [
    {
      id: "ADR-0001",
      href: "/documents/ADR-0001/",
      kind: "adr",
      status: "accepted",
      date: "2026-05-01",
      title: "Use Markdown as source of truth",
      summary: "Markdown remains canonical.",
      tags: ["source"],
      components: ["acta-core"],
      owners: ["Boris"],
      sectionsText: "Context Decision Consequences",
      bodyText: "Markdown files stay in Git.",
    },
    {
      id: "SPEC-0004",
      href: "/documents/SPEC-0004/",
      kind: "spec",
      status: "active",
      date: "2026-05-02",
      title: "Acta web viewer",
      summary: "Static document viewer.",
      tags: ["web"],
      components: ["acta-web"],
      owners: ["Boris"],
      sectionsText: "Requirements Client-side search",
      bodyText: "Astro interface with Orama search.",
    },
  ],
};

describe("web search utilities", () => {
  it("reads and normalizes q from URLs", () => {
    expect(getQueryFromUrl("https://acta.test/search?q=%20Astro%20")).toBe("Astro");
    expect(getQueryFromUrl("https://acta.test/search?q=%20%20")).toBe("");
    expect(getQueryFromUrl("https://acta.test/search")).toBe("");
  });

  it("updates q in URLs and removes empty queries", () => {
    expect(updateQueryInUrl("https://acta.test/search?kind=spec", "Astro").toString()).toBe(
      "https://acta.test/search?kind=spec&q=Astro",
    );
    expect(removeQueryFromUrl("https://acta.test/search?q=Astro&kind=spec").toString()).toBe(
      "https://acta.test/search?kind=spec",
    );
    expect(buildSearchUrl("Astro docs")).toBe("/search?q=Astro+docs");
    expect(buildSearchUrl("")).toBe("/search");
  });

  it("ranks exact ID and title matches before body matches", async () => {
    await expect(searchDocuments(index, "SPEC-0004")).resolves.toEqual(["SPEC-0004"]);
    await expect(searchDocuments(index, "markdown")).resolves.toEqual(["ADR-0001"]);
    await expect(searchDocuments(index, "orama")).resolves.toEqual(["SPEC-0004"]);
  });

  it("applies metadata filters after Orama ranking", async () => {
    await expect(searchDocuments(index, "search", { kind: "adr" })).resolves.toEqual([]);
    await expect(searchDocuments(index, "search", { kind: "spec" })).resolves.toEqual([
      "SPEC-0004",
    ]);
    await expect(searchDocuments(index, "source", { component: "acta-core" })).resolves.toEqual([
      "ADR-0001",
    ]);
  });
});
