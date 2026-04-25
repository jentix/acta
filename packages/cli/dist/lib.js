import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildRepositoryIndex, defaultFileNameForDocument, loadConfig } from "@adr-book/core";
import { buildDocumentArtifacts, buildSearchIndex, buildSiteMeta } from "@adr-book/renderer";
const DEFAULT_CONFIG = {
    title: "ADR Book",
    decisionsDir: "docs/decisions",
    specsDir: "docs/specs",
    templatesDir: "docs/templates",
    outputDir: "dist"
};
export function initWorkspace(cwd) {
    mkdirSync(path.join(cwd, DEFAULT_CONFIG.decisionsDir), { recursive: true });
    mkdirSync(path.join(cwd, DEFAULT_CONFIG.specsDir), { recursive: true });
    mkdirSync(path.join(cwd, DEFAULT_CONFIG.templatesDir), { recursive: true });
    const configPath = path.join(cwd, "adr-book.config.json");
    writeIfMissing(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n");
    writeIfMissing(path.join(cwd, DEFAULT_CONFIG.templatesDir, "adr.md"), createDocumentTemplate("adr"));
    writeIfMissing(path.join(cwd, DEFAULT_CONFIG.templatesDir, "spec.md"), createDocumentTemplate("spec"));
    writeIfMissing(path.join(cwd, DEFAULT_CONFIG.decisionsDir, "adr-0001-use-markdown-documents-with-yaml-frontmatter.md"), `---
id: ADR-0001
kind: adr
title: Use Markdown documents with YAML frontmatter
status: accepted
date: 2026-04-17
tags: [docs, architecture]
component: [adr-book-core]
owners: [Team]
summary: Store ADRs and specs as Markdown files with machine-readable metadata.
links:
  related: [SPEC-0001]
  supersedes: []
  replacedBy: []
  decidedBy: []
  dependsOn: []
  validates: []
  references: []
---

# Context

The repository needs docs-as-code documents that remain readable in GitHub and can still be validated and indexed by tooling.

# Decision

Store ADRs and specs as Markdown files with YAML frontmatter.

# Consequences

The CLI and web viewer can share a strict metadata model while authors keep using plain Markdown files.
`);
    writeIfMissing(path.join(cwd, DEFAULT_CONFIG.specsDir, "spec-0001-adr-book-document-model.md"), `---
id: SPEC-0001
kind: spec
title: ADR Book document model
status: active
date: 2026-04-17
tags: [model, docs]
component: [adr-book-core]
owners: [Team]
summary: Defines the document model, statuses, and document relationships.
links:
  related: [ADR-0001]
  supersedes: []
  replacedBy: []
  decidedBy: [ADR-0001]
  dependsOn: []
  validates: []
  references: []
---

# Summary

The system indexes Markdown documents with structured metadata and typed links.

# Goals

- Validate architecture decisions and technical specs.
- Build static artifacts for a read-only web viewer.

# Requirements

- Documents must have unique ids.
- Links must resolve across the repository.

# Proposed design

Use a shared core parser and validator, a CLI for authoring, and a static React app for reading.

# Open questions

- How far should search ranking go beyond client-side filtering?
`);
    return [
        configPath,
        path.join(cwd, DEFAULT_CONFIG.templatesDir, "adr.md"),
        path.join(cwd, DEFAULT_CONFIG.templatesDir, "spec.md")
    ];
}
export function createNewDocument(cwd, kind, title, owner) {
    const config = loadConfig(cwd);
    const nextId = getNextDocumentId(cwd, config, kind);
    const fileDir = path.join(cwd, kind === "adr" ? config.decisionsDir : config.specsDir);
    const document = {
        id: nextId,
        title,
        kind,
        date: new Date().toISOString().slice(0, 10)
    };
    const templateValues = owner === undefined
        ? document
        : {
            ...document,
            owner
        };
    const filePath = path.join(fileDir, defaultFileNameForDocument(document));
    writeFileSync(filePath, fillTemplate(createDocumentTemplate(kind), templateValues), "utf8");
    return filePath;
}
export function formatDocumentTable(index) {
    const rows = index.documents
        .slice()
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((document) => [
        document.id.padEnd(10),
        document.kind.padEnd(4),
        document.status.padEnd(11),
        (document.tags.join(",") || "-").padEnd(18),
        document.title
    ].join("  "));
    return [
        "ID         KIND  STATUS       TAGS                TITLE",
        ...rows
    ].join("\n");
}
export function formatDocumentDetails(index, id) {
    const document = index.documentsById[id];
    if (!document) {
        throw new Error(`Document not found: ${id}`);
    }
    const issues = index.issues.filter((issue) => issue.documentId === id);
    const backlinks = index.backlinks[id] ?? [];
    return [
        `${document.id} - ${document.title}`,
        `kind: ${document.kind}`,
        `status: ${document.status}`,
        `date: ${document.date}`,
        `tags: ${document.tags.join(", ") || "-"}`,
        `component: ${document.component.join(", ") || "-"}`,
        `owners: ${document.owners.join(", ") || "-"}`,
        `summary: ${document.summary ?? "-"}`,
        "links:",
        ...Object.entries(document.links).map(([type, values]) => `  ${type}: ${Array.isArray(values) && values.length > 0 ? values.join(", ") : "-"}`),
        `backlinks: ${backlinks.length > 0 ? backlinks.map((edge) => `${edge.from} (${edge.type})`).join(", ") : "-"}`,
        `issues: ${issues.length > 0 ? issues.map((issue) => `[${issue.level}] ${issue.message}`).join(" | ") : "-"}`
    ].join("\n");
}
export function formatIssues(index) {
    if (index.issues.length === 0) {
        return "Validation passed with no issues.";
    }
    return index.issues
        .map((issue) => {
        const location = issue.documentId ?? issue.filePath ?? "repository";
        return `[${issue.level.toUpperCase()}] ${issue.code} ${location}: ${issue.message}`;
    })
        .join("\n");
}
export function graphAsMermaid(index) {
    const lines = ["graph LR"];
    for (const node of index.graph.nodes) {
        lines.push(`  ${sanitizeMermaidId(node.id)}["${node.id}: ${escapeMermaidLabel(node.title)}"]`);
    }
    for (const edge of index.graph.edges) {
        lines.push(`  ${sanitizeMermaidId(edge.from)} -->|${edge.type}| ${sanitizeMermaidId(edge.to)}`);
    }
    return lines.join("\n");
}
export async function buildArtifacts(cwd) {
    const config = loadConfig(cwd);
    const index = buildRepositoryIndex(cwd, config);
    const builtDocuments = await buildDocumentArtifacts(index.documents, index.backlinks, index.issues);
    const searchIndex = buildSearchIndex(builtDocuments);
    const siteMeta = buildSiteMeta(config.title, builtDocuments);
    const outputDataDir = path.join(cwd, config.outputDir, "data");
    const webDataDir = path.join(cwd, "apps/web/public/data");
    mkdirSync(outputDataDir, { recursive: true });
    mkdirSync(webDataDir, { recursive: true });
    const graphPayload = {
        nodes: index.graph.nodes,
        edges: index.graph.edges,
        backlinks: index.backlinks
    };
    const outputs = [
        [path.join(outputDataDir, "documents.json"), builtDocuments],
        [path.join(outputDataDir, "graph.json"), graphPayload],
        [path.join(outputDataDir, "search-index.json"), searchIndex],
        [path.join(outputDataDir, "site-meta.json"), siteMeta],
        [path.join(webDataDir, "documents.json"), builtDocuments],
        [path.join(webDataDir, "graph.json"), graphPayload],
        [path.join(webDataDir, "search-index.json"), searchIndex],
        [path.join(webDataDir, "site-meta.json"), siteMeta]
    ];
    for (const [filePath, payload] of outputs) {
        writeFileSync(filePath, JSON.stringify(payload, null, 2) + "\n", "utf8");
    }
    return outputs.map(([filePath]) => filePath);
}
export function loadIndex(cwd) {
    const config = loadConfig(cwd);
    return buildRepositoryIndex(cwd, config);
}
export function getNextDocumentId(cwd, config, kind) {
    const directory = path.join(cwd, kind === "adr" ? config.decisionsDir : config.specsDir);
    const prefix = kind === "adr" ? "ADR" : "SPEC";
    const maxId = findMarkdownFiles(directory)
        .map((filePath) => readFileSync(filePath, "utf8"))
        .map((content) => content.match(/^id:\s*([A-Z]+)-(\d{4})$/m))
        .filter((match) => Boolean(match))
        .filter((match) => match[1] === prefix)
        .map((match) => Number(match[2]))
        .reduce((max, value) => Math.max(max, value), 0);
    return `${prefix}-${String(maxId + 1).padStart(4, "0")}`;
}
function createDocumentTemplate(kind) {
    if (kind === "adr") {
        return `---
id: {{id}}
kind: adr
title: {{title}}
status: proposed
date: {{date}}
tags: []
component: []
owners: [{{owner}}]
summary:
links:
  related: []
  supersedes: []
  replacedBy: []
  decidedBy: []
  dependsOn: []
  validates: []
  references: []
---

# Context

# Decision

# Consequences
`;
    }
    return `---
id: {{id}}
kind: spec
title: {{title}}
status: draft
date: {{date}}
tags: []
component: []
owners: [{{owner}}]
summary:
links:
  related: []
  supersedes: []
  replacedBy: []
  decidedBy: []
  dependsOn: []
  validates: []
  references: []
---

# Summary

# Goals

# Requirements

# Proposed design

# Open questions
`;
}
function fillTemplate(template, values) {
    return template
        .replaceAll("{{id}}", values.id)
        .replaceAll("{{title}}", values.title)
        .replaceAll("{{date}}", values.date)
        .replaceAll("{{owner}}", values.owner ?? "Team");
}
function writeIfMissing(filePath, content) {
    try {
        statSync(filePath);
    }
    catch {
        writeFileSync(filePath, content, "utf8");
    }
}
function findMarkdownFiles(dirPath) {
    try {
        return readdirSync(dirPath).flatMap((entry) => {
            const filePath = path.join(dirPath, entry);
            const stat = statSync(filePath);
            if (stat.isDirectory()) {
                return findMarkdownFiles(filePath);
            }
            return filePath.endsWith(".md") ? [filePath] : [];
        });
    }
    catch {
        return [];
    }
}
function sanitizeMermaidId(id) {
    return id.replace(/[^a-zA-Z0-9_]/g, "_");
}
function escapeMermaidLabel(label) {
    return label.replace(/"/g, '\\"');
}
//# sourceMappingURL=lib.js.map