import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { createHighlighter } from "shiki";
let highlighterPromise;
async function getHighlighter() {
    highlighterPromise ??= createHighlighter({
        themes: ["github-light"],
        langs: ["ts", "tsx", "js", "json", "md", "bash", "yaml"]
    });
    return highlighterPromise;
}
export async function renderDocument(document) {
    const highlighter = await getHighlighter();
    const html = String(await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(() => async (tree) => {
        const visit = (await import("unist-util-visit")).visit;
        visit(tree, "code", (node) => {
            const lang = typeof node.lang === "string" && node.lang ? node.lang : "text";
            node.type = "html";
            node.value = highlighter.codeToHtml(node.value, {
                lang: lang,
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
        .process(document.body));
    const bodyText = document.body.replace(/[#*_`>-]/g, " ").replace(/\s+/g, " ").trim();
    return {
        id: document.id,
        html,
        bodyText
    };
}
export async function buildDocumentArtifacts(documents, backlinks, issues) {
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
export function buildSearchIndex(documents) {
    return documents.map((document) => document.summary === undefined
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
        });
}
export function buildSiteMeta(title, documents) {
    const countsByKind = {
        adr: documents.filter((document) => document.kind === "adr").length,
        spec: documents.filter((document) => document.kind === "spec").length
    };
    const countsByStatus = {};
    const tagSet = new Set();
    const componentSet = new Set();
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
//# sourceMappingURL=index.js.map