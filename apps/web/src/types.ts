export interface BuiltDocumentArtifact {
  id: string;
  kind: "adr" | "spec";
  status: string;
  title: string;
  date: string;
  tags: string[];
  component: string[];
  owners: string[];
  summary?: string;
  links: {
    related: string[];
    supersedes: string[];
    replacedBy: string[];
    decidedBy: string[];
    dependsOn: string[];
    validates: string[];
    references: string[];
  };
  filePath: string;
  slug: string;
  headings: string[];
  html: string;
  bodyText: string;
  backlinks: GraphEdge[];
  issues: ValidationIssue[];
}

export interface GraphNode {
  id: string;
  kind: "adr" | "spec";
  status: string;
  title: string;
  tags: string[];
}

export interface GraphEdge {
  from: string;
  to: string;
  type: string;
}

export interface ValidationIssue {
  level: "error" | "warning";
  code: string;
  message: string;
  documentId?: string;
  filePath?: string;
}

export interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
  backlinks: Record<string, GraphEdge[]>;
}

export interface SearchEntry {
  id: string;
  title: string;
  kind: "adr" | "spec";
  status: string;
  tags: string[];
  summary?: string;
  bodyText: string;
}

export interface SiteMeta {
  title: string;
  totalDocuments: number;
  countsByKind: Record<"adr" | "spec", number>;
  countsByStatus: Record<string, number>;
  tags: string[];
  components: string[];
}

export interface AppData {
  documents: BuiltDocumentArtifact[];
  graph: GraphPayload;
  searchIndex: SearchEntry[];
  siteMeta: SiteMeta;
}
