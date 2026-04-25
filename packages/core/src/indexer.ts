import path from "node:path";
import { readdirSync, statSync } from "node:fs";

import type { AdrBookConfig } from "./config.js";
import { parseDocumentFile } from "./parser.js";
import type {
  Document,
  GraphEdge,
  GraphNode,
  LinkType,
  RepositoryIndex,
  ValidationIssue
} from "./types.js";

const LINK_TYPES: LinkType[] = [
  "related",
  "supersedes",
  "replacedBy",
  "decidedBy",
  "dependsOn",
  "validates"
];

export function buildRepositoryIndex(
  cwd: string,
  config: AdrBookConfig
): RepositoryIndex {
  const issueList: ValidationIssue[] = [];
  const documents: Document[] = [];
  const files = [
    ...findMarkdownFiles(path.join(cwd, config.decisionsDir)),
    ...findMarkdownFiles(path.join(cwd, config.specsDir))
  ];

  for (const filePath of files) {
    const result = parseDocumentFile(filePath);
    issueList.push(...result.issues);
    if (result.document) {
      documents.push(result.document);
    }
  }

  const documentsById: Record<string, Document> = {};
  for (const document of documents) {
    if (documentsById[document.id]) {
      issueList.push({
        level: "error",
        code: "duplicate_id",
        message: `Duplicate document id "${document.id}"`,
        documentId: document.id,
        filePath: document.filePath
      });
      continue;
    }
    documentsById[document.id] = document;
  }

  const edges: GraphEdge[] = [];
  const backlinks: Record<string, GraphEdge[]> = {};
  for (const document of documents) {
    for (const type of LINK_TYPES) {
      for (const targetId of document.links[type]) {
        const target = documentsById[targetId];
        if (!target) {
          issueList.push({
            level: "error",
            code: "broken_link",
            message: `Link "${type}" points to missing document "${targetId}"`,
            documentId: document.id,
            filePath: document.filePath
          });
          continue;
        }

        if (type === "supersedes" && (document.kind !== "adr" || target.kind !== "adr")) {
          issueList.push({
            level: "error",
            code: "invalid_link_target",
            message: `Link "supersedes" is only allowed between ADR documents`,
            documentId: document.id,
            filePath: document.filePath
          });
        }

        if (type === "decidedBy" && (document.kind !== "spec" || target.kind !== "adr")) {
          issueList.push({
            level: "error",
            code: "invalid_link_target",
            message: `Link "decidedBy" is only allowed from spec to ADR`,
            documentId: document.id,
            filePath: document.filePath
          });
        }

        const edge = { from: document.id, to: targetId, type };
        edges.push(edge);
        backlinks[targetId] ??= [];
        backlinks[targetId].push(edge);
      }
    }
  }

  issueList.push(...validateSupersedeCycles(documentsById, edges));
  issueList.push(...validateStatusRules(documents, backlinks));

  const nodes: GraphNode[] = documents.map((document) => ({
    id: document.id,
    kind: document.kind,
    status: document.status,
    title: document.title,
    tags: document.tags
  }));

  return {
    documents,
    documentsById,
    backlinks,
    graph: { nodes, edges },
    issues: issueList
  };
}

function findMarkdownFiles(dirPath: string): string[] {
  try {
    const entries = readdirSync(dirPath);
    const files: string[] = [];
    for (const entry of entries) {
      const filePath = path.join(dirPath, entry);
      const stat = statSync(filePath);
      if (stat.isDirectory()) {
        files.push(...findMarkdownFiles(filePath));
      } else if (stat.isFile() && filePath.endsWith(".md")) {
        files.push(filePath);
      }
    }
    return files;
  } catch {
    return [];
  }
}

function validateSupersedeCycles(
  documentsById: Record<string, Document>,
  edges: GraphEdge[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.type !== "supersedes") {
      continue;
    }
    adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge.to]);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visitNode(nodeId: string, trail: string[]): void {
    if (visiting.has(nodeId)) {
      const cycleIssue: ValidationIssue = {
        level: "error",
        code: "supersedes_cycle",
        message: `Supersedes cycle detected: ${[...trail, nodeId].join(" -> ")}`,
        documentId: nodeId
      };
      const filePath = documentsById[nodeId]?.filePath;
      if (filePath) {
        cycleIssue.filePath = filePath;
      }
      issues.push(cycleIssue);
      return;
    }

    if (visited.has(nodeId)) {
      return;
    }

    visiting.add(nodeId);
    for (const nextId of adjacency.get(nodeId) ?? []) {
      visitNode(nextId, [...trail, nodeId]);
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
  }

  for (const nodeId of Object.keys(documentsById)) {
    visitNode(nodeId, []);
  }

  return issues;
}

function validateStatusRules(
  documents: Document[],
  backlinks: Record<string, GraphEdge[]>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const document of documents) {
    if (document.kind === "adr" && document.status === "superseded") {
      const incomingSupersedes =
        backlinks[document.id]?.some((edge) => edge.type === "supersedes") ?? false;
      if (!incomingSupersedes && document.links.replacedBy.length === 0) {
        issues.push({
          level: "error",
          code: "superseded_without_replacement",
          message:
            'Superseded ADR must have "replacedBy" or an incoming "supersedes" link',
          documentId: document.id,
          filePath: document.filePath
        });
      }
    }

    if (
      document.kind === "spec" &&
      document.status === "implemented" &&
      document.links.decidedBy.length === 0 &&
      document.links.validates.length === 0
    ) {
      issues.push({
        level: "warning",
        code: "implemented_spec_without_proof",
        message:
          'Implemented spec should have at least one "decidedBy" or "validates" link',
        documentId: document.id,
        filePath: document.filePath
      });
    }
  }
  return issues;
}
