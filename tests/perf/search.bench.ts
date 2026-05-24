import { gzipSync } from "node:zlib";
import { bench, describe } from "vitest";
import { searchDocuments, type WebSearchIndexArtifact } from "../../apps/web/src/lib/search.js";

const documentCounts = [100, 500, 1000] as const;

describe("search scalability", () => {
  for (const count of documentCounts) {
    const primary = makeIndex(count, false);
    const full = makeIndex(count, true);

    bench(`primary index metadata search (${count} docs)`, async () => {
      await searchDocuments(primary, `SPEC-${String(Math.min(count, 42)).padStart(4, "0")}`);
    });

    bench(`full index body search (${count} docs)`, async () => {
      await searchDocuments(full, "replicated body phrase");
    });
  }
});

for (const count of documentCounts) {
  const primary = JSON.stringify(makeIndex(count, false));
  const full = JSON.stringify(makeIndex(count, true));
  console.info(
    `search-index ${count} docs: primary=${formatBytes(primary.length)} ` +
      `primary.gzip=${formatBytes(gzipSync(primary).byteLength)} full=${formatBytes(full.length)} ` +
      `full.gzip=${formatBytes(gzipSync(full).byteLength)}`,
  );
}

function makeIndex(count: number, includeBody: boolean): WebSearchIndexArtifact {
  return {
    schemaVersion: "1.0.0",
    documents: Array.from({ length: count }, (_, index) => {
      const ordinal = index + 1;
      const kind = ordinal % 3 === 0 ? "adr" : "spec";
      const id = `${kind === "adr" ? "ADR" : "SPEC"}-${String(ordinal).padStart(4, "0")}`;
      const base = {
        id,
        href: `/documents/${id}/`,
        kind,
        status: kind === "adr" ? "accepted" : "active",
        date: `2026-05-${String((ordinal % 28) + 1).padStart(2, "0")}`,
        title: `Synthetic document ${ordinal} for search scalability`,
        summary: `Metadata summary for ${id} covering indexing and filters.`,
        tags: [`tag-${ordinal % 10}`, "search"],
        components: [`component-${ordinal % 5}`],
        owners: [`owner-${ordinal % 7}`],
      } satisfies WebSearchIndexArtifact["documents"][number];

      if (!includeBody) {
        return base;
      }

      return {
        ...base,
        sectionsText: `Context\nSynthetic section text for ${id}.\nRequirements\nSearch must rank metadata before content.`,
        bodyText:
          `# ${base.title}\n\n` +
          "This replicated body phrase simulates a longer architectural document. ".repeat(16),
      };
    }),
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }

  return `${(bytes / 1024).toFixed(1)}KB`;
}
