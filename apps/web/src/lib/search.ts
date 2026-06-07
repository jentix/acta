import {
  type SearchIndexArtifact,
  type SearchIndexDocument,
  searchDocuments as searchCoreDocuments,
} from "@acta-dev/core/search";

export type WebSearchIndexArtifact = SearchIndexArtifact;
export type WebSearchIndexDocument = SearchIndexDocument;

export interface WebSearchFilters {
  kind?: string;
  status?: string;
  tag?: string;
  component?: string;
}

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
  return (await searchCoreDocuments(index, query, filters)).map((document) => document.id);
}
