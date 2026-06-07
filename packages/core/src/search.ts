import { create, insertMultiple, search } from "@orama/orama";
import type { SearchIndexArtifact, SearchIndexDocument } from "./artifacts.js";

export type { SearchIndexArtifact, SearchIndexDocument } from "./artifacts.js";

export interface SearchFilters {
  kind?: string;
  status?: string;
  tag?: string;
  component?: string;
  owner?: string;
}

const searchSchema = {
  id: "string",
  href: "string",
  kind: "string",
  status: "string",
  date: "string",
  title: "string",
  summary: "string",
  tags: "string[]",
  components: "string[]",
  owners: "string[]",
} as const;

const fullSearchSchema = {
  ...searchSchema,
  sectionsText: "string",
  bodyText: "string",
} as const;

export async function searchDocuments(
  index: SearchIndexArtifact,
  query: string,
  filters: SearchFilters = {},
): Promise<SearchIndexDocument[]> {
  const normalizedQuery = query.trim();
  const filteredDocuments = normalizedQuery
    ? await rankedDocuments(index, normalizedQuery)
    : index.documents;

  return filteredDocuments.filter((document) => matchesFilters(document, filters));
}

function matchesFilters(document: SearchIndexDocument, filters: SearchFilters): boolean {
  return (
    (!filters.kind || document.kind === filters.kind) &&
    (!filters.status || document.status === filters.status) &&
    (!filters.tag || document.tags.includes(filters.tag)) &&
    (!filters.component || document.components.includes(filters.component)) &&
    (!filters.owner || document.owners.includes(filters.owner))
  );
}

async function rankedDocuments(
  index: SearchIndexArtifact,
  query: string,
): Promise<SearchIndexDocument[]> {
  const searchesBody = index.documents.some(
    (document) => document.sectionsText !== undefined || document.bodyText !== undefined,
  );

  if (searchesBody) {
    const db = create({ schema: fullSearchSchema });
    await insertMultiple(db, index.documents);
    const result = await search<typeof db, SearchIndexDocument>(db, {
      term: query,
      properties: [
        "id",
        "title",
        "summary",
        "tags",
        "components",
        "owners",
        "sectionsText",
        "bodyText",
      ],
      boost: {
        id: 16,
        title: 10,
        tags: 6,
        components: 6,
        owners: 6,
        summary: 4,
        sectionsText: 2,
        bodyText: 1,
      },
      limit: index.documents.length,
    });

    return result.hits.map((hit) => hit.document);
  }

  const db = create({ schema: searchSchema });
  await insertMultiple(db, index.documents);
  const result = await search<typeof db, SearchIndexDocument>(db, {
    term: query,
    properties: ["id", "title", "summary", "tags", "components", "owners"],
    boost: {
      id: 16,
      title: 10,
      tags: 6,
      components: 6,
      owners: 6,
      summary: 4,
    },
    limit: index.documents.length,
  });

  return result.hits.map((hit) => hit.document);
}
