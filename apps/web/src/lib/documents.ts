import type { ActaDocument, InternalLinkKey, ValidationIssue } from "@acta/core";

export interface DocumentFilters {
  query?: string;
  kind?: string;
  status?: string;
  tag?: string;
  component?: string;
}

export interface FilterOptions {
  kinds: string[];
  statuses: string[];
  tags: string[];
  components: string[];
}

export const documentPageSize = 20;

export const internalLinkKeys: InternalLinkKey[] = [
  "related",
  "supersedes",
  "replacedBy",
  "decidedBy",
  "dependsOn",
  "validates",
];

export function buildDocumentHref(id: string): string {
  return `/documents/${encodeURIComponent(id)}/`;
}

export function collectFilterOptions(documents: ActaDocument[]): FilterOptions {
  return {
    kinds: uniqueSorted(documents.map((document) => document.kind)),
    statuses: uniqueSorted(documents.map((document) => document.status)),
    tags: uniqueSorted(documents.flatMap((document) => document.tags)),
    components: uniqueSorted(documents.flatMap((document) => document.component)),
  };
}

export function filterDocuments(
  documents: ActaDocument[],
  filters: DocumentFilters,
): ActaDocument[] {
  const query = normalize(filters.query ?? "");

  return documents.filter((document) => {
    if (filters.kind && document.kind !== filters.kind) {
      return false;
    }

    if (filters.status && document.status !== filters.status) {
      return false;
    }

    if (filters.tag && !document.tags.includes(filters.tag)) {
      return false;
    }

    if (filters.component && !document.component.includes(filters.component)) {
      return false;
    }

    return query.length === 0 || getDocumentSearchText(document).includes(query);
  });
}

export function sortDocumentsByNewest(documents: ActaDocument[]): ActaDocument[] {
  return documents.slice().sort((left, right) => {
    const dateOrder = right.date.localeCompare(left.date);
    return dateOrder === 0 ? right.id.localeCompare(left.id) : dateOrder;
  });
}

export function buildDocumentOrderIndex(documents: ActaDocument[]): Record<string, number> {
  return Object.fromEntries(documents.map((document, index) => [document.id, index]));
}

export function getNextDocumentLimit(
  currentLimit: number,
  matchingCount: number,
  pageSize = documentPageSize,
): number {
  return Math.min(currentLimit + pageSize, matchingCount);
}

export function shouldShowMoreDocuments(matchingCount: number, visibleLimit: number): boolean {
  return matchingCount > visibleLimit;
}

export function getDocumentSearchText(document: ActaDocument): string {
  return normalize(
    [
      document.id,
      document.title,
      document.summary ?? "",
      document.status,
      document.kind,
      ...document.tags,
      ...document.component,
      ...document.owners,
      ...document.sections.flatMap((section) => [section.title, section.content]),
      document.body,
    ].join(" "),
  );
}

export function getIssuesForDocument(
  issues: ValidationIssue[],
  document: ActaDocument,
): ValidationIssue[] {
  return issues.filter(
    (issue) => issue.documentId === document.id || issue.path === document.file.path,
  );
}

export function getDocumentById(documents: ActaDocument[], id: string): ActaDocument | undefined {
  return documents.find((document) => document.id === id);
}

export function hasInternalLinks(document: ActaDocument): boolean {
  return internalLinkKeys.some((key) => document.links[key].length > 0);
}

export function hasBacklinks(document: ActaDocument): boolean {
  return internalLinkKeys.some((key) => document.backlinks[key].length > 0);
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort((left, right) =>
    left.localeCompare(right),
  );
}
