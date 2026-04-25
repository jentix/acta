import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { createHighlighter } from "shiki";

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

let highlighterPromise: Promise<Awaited<ReturnType<typeof createHighlighter>>> | undefined;

async function getHighlighter() {
  highlighterPromise ??= createHighlighter({
    themes: ["github-light"],
    langs: ["ts", "tsx", "js", "json", "md", "bash", "yaml"]
  });
  return highlighterPromise;
}

export async function renderDocument(document: RepoDocument): Promise<RenderedDocument> {
  const highlighter = await getHighlighter();
  const html = String(
    await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(() => async (tree: any) => {
        const visit = (await import("unist-util-visit")).visit;
        visit(tree, "code", (node: any) => {
          const lang = typeof node.lang === "string" && node.lang ? node.lang : "text";
          node.type = "html";
          node.value = highlighter.codeToHtml(node.value, {
            lang: lang as any,
            theme: "github-light"
          });
        });
      })
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeSanitize, {
        tagNames: [
          "a",
          "article",
          "blockquote",
          "br",
          "code",
          "div",
          "em",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "hr",
          "li",
          "ol",
          "p",
          "pre",
          "section",
          "span",
          "strong",
          "table",
          "tbody",
          "td",
          "th",
          "thead",
          "tr",
          "ul"
        ],
        attributes: {
          "*": ["className"],
          a: ["href", "title", "target", "rel"],
          code: ["className"],
          div: ["className", "style"],
          span: ["className", "style"],
          pre: ["className", "style"]
        }
      })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(document.body)
  );

  const bodyText = document.body.replace(/[#*_`>-]/g, " ").replace(/\s+/g, " ").trim();
  return {
    id: document.id,
    html,
    bodyText
  };
}

export async function buildDocumentArtifacts(
  documents: RepoDocument[],
  backlinks: Record<string, GraphEdge[]>,
  issues: ValidationIssue[]
): Promise<BuiltDocumentArtifact[]> {
  const rendered = await Promise.all(documents.map((document) => renderDocument(document)));
  const renderedById = new Map(rendered.map((entry) => [entry.id, entry]));

  return documents.map((document) => {
    const render = renderedById.get(document.id);
    const artifactBase = {
      id: document.id,
      kind: document.kind,
      status: document.status,
      title: document.title,
      date: document.date,
      tags: document.tags,
      component: document.component,
      owners: document.owners,
      links: document.links,
      filePath: document.filePath,
      slug: document.slug,
      headings: document.headings,
      html: render?.html ?? "",
      bodyText: render?.bodyText ?? "",
      backlinks: backlinks[document.id] ?? [],
      issues: issues.filter((issue) => issue.documentId === document.id)
    };
    return document.summary === undefined
      ? artifactBase
      : {
          ...artifactBase,
          summary: document.summary
        };
  });
}

export function buildSearchIndex(documents: BuiltDocumentArtifact[]): SearchEntry[] {
  return documents.map((document) =>
    document.summary === undefined
      ? {
          id: document.id,
          title: document.title,
          kind: document.kind,
          status: document.status,
          tags: document.tags,
          bodyText: document.bodyText
        }
      : {
          id: document.id,
          title: document.title,
          kind: document.kind,
          status: document.status,
          tags: document.tags,
          summary: document.summary,
          bodyText: document.bodyText
        }
  );
}

export function buildSiteMeta(
  title: string,
  documents: BuiltDocumentArtifact[]
): SiteMeta {
  const countsByKind = {
    adr: documents.filter((document) => document.kind === "adr").length,
    spec: documents.filter((document) => document.kind === "spec").length
  };
  const countsByStatus: Record<string, number> = {};
  const tagSet = new Set<string>();
  const componentSet = new Set<string>();

  for (const document of documents) {
    countsByStatus[document.status] = (countsByStatus[document.status] ?? 0) + 1;
    for (const tag of document.tags) {
      tagSet.add(tag);
    }
    for (const component of document.component) {
      componentSet.add(component);
    }
  }

  return {
    title,
    totalDocuments: documents.length,
    countsByKind,
    countsByStatus,
    tags: [...tagSet].sort(),
    components: [...componentSet].sort()
  };
}
