import { create, insertMultiple, search } from "@orama/orama";

export interface WebSearchIndexArtifact {
  schemaVersion: string;
  documents: WebSearchIndexDocument[];
}

export interface WebSearchIndexDocument {
  id: string;
  href: string;
  kind: "adr" | "spec";
  status: string;
  date: string;
  title: string;
  summary: string;
  tags: string[];
  components: string[];
  owners: string[];
  sectionsText: string;
  bodyText: string;
}

export interface WebSearchFilters {
  kind?: string;
  status?: string;
  tag?: string;
  component?: string;
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
  sectionsText: "string",
  bodyText: "string",
} as const;

export function getQueryFromUrl(url: string | URL): string {
  return new URL(url).searchParams.get("q")?.trim() ?? "";
}

export function updateQueryInUrl(url: string | URL, query: string): URL {
  const nextUrl = new URL(url);
  const normalizedQuery = query.trim();

  if (normalizedQuery.length > 0) {
    nextUrl.searchParams.set("q", normalizedQuery);
  } else {
    nextUrl.searchParams.delete("q");
  }

  return nextUrl;
}

export function removeQueryFromUrl(url: string | URL): URL {
  return updateQueryInUrl(url, "");
}

export function buildSearchUrl(query: string): string {
  const url = updateQueryInUrl("https://acta.local/search", query);
  return `${url.pathname}${url.search}`;
}

export async function searchDocuments(
  index: WebSearchIndexArtifact,
  query: string,
  filters: WebSearchFilters = {},
): Promise<string[]> {
  const normalizedQuery = query.trim();
  const filteredDocuments = normalizedQuery
    ? await rankedDocuments(index, normalizedQuery)
    : index.documents;

  return filteredDocuments.filter((document) => matchesFilters(document, filters)).map((document) => document.id);
}

function matchesFilters(document: WebSearchIndexDocument, filters: WebSearchFilters): boolean {
  return (
    (!filters.kind || document.kind === filters.kind) &&
    (!filters.status || document.status === filters.status) &&
    (!filters.tag || document.tags.includes(filters.tag)) &&
    (!filters.component || document.components.includes(filters.component))
  );
}

async function rankedDocuments(
  index: WebSearchIndexArtifact,
  query: string,
): Promise<WebSearchIndexDocument[]> {
  const db = await create({ schema: searchSchema });
  await insertMultiple(db, index.documents);
  const result = await search<typeof db, WebSearchIndexDocument>(db, {
    term: query,
    properties: ["id", "title", "summary", "tags", "components", "owners", "sectionsText", "bodyText"],
    boost: {
      id: 16,
      title: 10,
      tags: 6,
      components: 6,
      summary: 4,
      sectionsText: 2,
      bodyText: 1,
    },
    limit: index.documents.length,
  });

  return result.hits.map((hit) => hit.document);
}
