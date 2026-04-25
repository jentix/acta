import type { BuiltDocumentArtifact } from "./types";

export interface DocumentFilters {
  query: string;
  kind: string;
  status: string;
  tag: string;
}

export function filterDocuments(
  documents: BuiltDocumentArtifact[],
  filters: DocumentFilters
): BuiltDocumentArtifact[] {
  const query = filters.query.trim().toLowerCase();
  return documents.filter((document) => {
    const matchesQuery =
      query.length === 0 ||
      [document.id, document.title, document.summary ?? "", document.bodyText, ...document.tags]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesKind = filters.kind === "all" || document.kind === filters.kind;
    const matchesStatus = filters.status === "all" || document.status === filters.status;
    const matchesTag = filters.tag === "all" || document.tags.includes(filters.tag);
    return matchesQuery && matchesKind && matchesStatus && matchesTag;
  });
}

export function sortDocuments(documents: BuiltDocumentArtifact[]): BuiltDocumentArtifact[] {
  return documents.slice().sort((left, right) => left.id.localeCompare(right.id));
}
