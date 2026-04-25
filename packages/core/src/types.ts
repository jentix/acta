export type DocumentKind = "adr" | "spec";

export type AdrStatus =
  | "proposed"
  | "accepted"
  | "rejected"
  | "deprecated"
  | "superseded";

export type SpecStatus =
  | "draft"
  | "active"
  | "paused"
  | "implemented"
  | "obsolete";

export type DocumentStatus = AdrStatus | SpecStatus;
export type DocumentId = string;
export type LinkType =
  | "related"
  | "supersedes"
  | "replacedBy"
  | "decidedBy"
  | "dependsOn"
  | "validates";

export interface DocumentLinkSet {
  related: DocumentId[];
  supersedes: DocumentId[];
  replacedBy: DocumentId[];
  decidedBy: DocumentId[];
  dependsOn: DocumentId[];
  validates: DocumentId[];
  references: string[];
}

export interface BaseDocument {
  id: DocumentId;
  kind: DocumentKind;
  title: string;
  status: DocumentStatus;
  date: string;
  tags: string[];
  component: string[];
  owners: string[];
  summary?: string;
  links: DocumentLinkSet;
  filePath: string;
  slug: string;
  body: string;
  headings: string[];
}

export interface AdrDocument extends BaseDocument {
  kind: "adr";
  status: AdrStatus;
}

export interface SpecDocument extends BaseDocument {
  kind: "spec";
  status: SpecStatus;
}

export type Document = AdrDocument | SpecDocument;

export interface GraphNode {
  id: DocumentId;
  kind: DocumentKind;
  status: DocumentStatus;
  title: string;
  tags: string[];
}

export interface GraphEdge {
  from: DocumentId;
  to: DocumentId;
  type: LinkType;
}

export interface ValidationIssue {
  level: "error" | "warning";
  code:
    | "schema_invalid"
    | "duplicate_id"
    | "broken_link"
    | "invalid_link_target"
    | "missing_section"
    | "supersedes_cycle"
    | "superseded_without_replacement"
    | "implemented_spec_without_proof"
    | "document_not_found";
  message: string;
  documentId?: DocumentId;
  filePath?: string;
  details?: Record<string, string>;
}

export interface RepositoryIndex {
  documents: Document[];
  documentsById: Record<DocumentId, Document>;
  backlinks: Record<DocumentId, GraphEdge[]>;
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  issues: ValidationIssue[];
}

export interface ParsedDocumentResult {
  document?: Document;
  issues: ValidationIssue[];
}

export interface SiteMeta {
  title: string;
  totalDocuments: number;
  countsByKind: Record<DocumentKind, number>;
  countsByStatus: Record<string, number>;
  tags: string[];
  components: string[];
}

export interface SearchEntry {
  id: DocumentId;
  title: string;
  kind: DocumentKind;
  status: DocumentStatus;
  tags: string[];
  summary?: string;
  bodyText: string;
}
