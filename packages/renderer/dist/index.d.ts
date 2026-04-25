interface RepoDocument {
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
    body: string;
    headings: string[];
}
interface GraphEdge {
    from: string;
    to: string;
    type: string;
}
interface ValidationIssue {
    level: "error" | "warning";
    code: string;
    message: string;
    documentId?: string;
    filePath?: string;
}
interface SearchEntry {
    id: string;
    title: string;
    kind: RepoDocument["kind"];
    status: RepoDocument["status"];
    tags: string[];
    summary?: string;
    bodyText: string;
}
interface SiteMeta {
    title: string;
    totalDocuments: number;
    countsByKind: Record<RepoDocument["kind"], number>;
    countsByStatus: Record<string, number>;
    tags: string[];
    components: string[];
}
export interface RenderedDocument {
    id: string;
    html: string;
    bodyText: string;
}
export interface BuiltDocumentArtifact {
    id: string;
    kind: RepoDocument["kind"];
    status: RepoDocument["status"];
    title: string;
    date: string;
    tags: string[];
    component: string[];
    owners: string[];
    summary?: string;
    links: RepoDocument["links"];
    filePath: string;
    slug: string;
    headings: string[];
    html: string;
    bodyText: string;
    backlinks: GraphEdge[];
    issues: ValidationIssue[];
}
export declare function renderDocument(document: RepoDocument): Promise<RenderedDocument>;
export declare function buildDocumentArtifacts(documents: RepoDocument[], backlinks: Record<string, GraphEdge[]>, issues: ValidationIssue[]): Promise<BuiltDocumentArtifact[]>;
export declare function buildSearchIndex(documents: BuiltDocumentArtifact[]): SearchEntry[];
export declare function buildSiteMeta(title: string, documents: BuiltDocumentArtifact[]): SiteMeta;
export {};
