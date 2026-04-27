import type { ActaDocument, DocumentLinkSet, InternalLinkKey } from "./schema.js";
import { createEmptyLinks, internalLinkKeys } from "./schema.js";

export interface GraphNode {
  id: string;
  kind: "adr" | "spec";
  status: string;
  title: string;
  tags: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  type: InternalLinkKey;
}

export interface DocumentGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function buildGraph(documents: ActaDocument[]): DocumentGraph {
  const nodes = documents.map((document) => ({
    id: document.id,
    kind: document.kind,
    status: document.status,
    title: document.title,
    tags: document.tags,
  }));
  const edges = documents.flatMap((document) =>
    internalLinkKeys.flatMap((type) =>
      document.links[type].map((target) => ({
        source: document.id,
        target,
        type,
      })),
    ),
  );

  return { nodes, edges };
}

export function deriveBacklinks(documents: ActaDocument[]): ActaDocument[] {
  const documentsById = new Map(documents.map((document) => [document.id, document]));
  const backlinksById = new Map(documents.map((document) => [document.id, createEmptyLinks()]));

  for (const document of documents) {
    for (const key of internalLinkKeys) {
      for (const targetId of document.links[key]) {
        backlinksById.get(targetId)?.[key].push(document.id);
      }
    }
  }

  return documents.map((document) => {
    const existing = documentsById.get(document.id);
    return {
      ...(existing ?? document),
      backlinks: backlinksById.get(document.id) ?? createEmptyLinks(),
    };
  });
}

export function typedInternalLinks(links: DocumentLinkSet): string[] {
  return internalLinkKeys.flatMap((key) => links[key] ?? []);
}
