import path from "node:path";
import { readFileSync } from "node:fs";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";

import { documentMetadataSchema } from "./schema.js";
import type {
  Document,
  ParsedDocumentResult,
  ValidationIssue
} from "./types.js";

const REQUIRED_HEADINGS: Record<Document["kind"], string[]> = {
  adr: ["Context", "Decision", "Consequences"],
  spec: ["Summary", "Goals", "Requirements", "Proposed design"]
};

export function parseDocumentFile(filePath: string): ParsedDocumentResult {
  const source = readFileSync(filePath, "utf8");
  const parsed = matter(source);
  const metadataResult = documentMetadataSchema.safeParse(parsed.data);

  if (!metadataResult.success) {
    return {
      issues: [
        {
          level: "error",
          code: "schema_invalid",
          message: metadataResult.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; "),
          filePath
        }
      ]
    };
  }

  const tree = unified().use(remarkParse).use(remarkGfm).parse(parsed.content);
  const headings: string[] = [];
  visit(tree, "heading", (node: any) => {
    const text = node.children
      .filter((child: any) => child.type === "text" || child.type === "inlineCode")
      .map((child: any) => child.value)
      .join("")
      .trim();
    if (text) {
      headings.push(text);
    }
  });

  const metadata = metadataResult.data;
  const slug = slugFromTitle(metadata.title);
  const issues: ValidationIssue[] = [];
  for (const heading of REQUIRED_HEADINGS[metadata.kind]) {
    if (!headings.includes(heading)) {
      issues.push({
        level: "error",
        code: "missing_section",
        message: `Missing required heading "${heading}"`,
        documentId: metadata.id,
        filePath
      });
    }
  }

  const { summary, ...restMetadata } = metadata;
  const documentBase = {
    ...restMetadata,
    filePath,
    slug,
    body: parsed.content.trim(),
    headings
  };
  const document: Document =
    summary === undefined
      ? documentBase
      : {
          ...documentBase,
          summary
        };

  return { document, issues };
}

export function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function defaultFileNameForDocument(document: Pick<Document, "id" | "title">): string {
  return `${document.id.toLowerCase()}-${slugFromTitle(document.title)}.md`;
}

export function relativeDocumentPath(rootDir: string, filePath: string): string {
  return path.relative(rootDir, filePath);
}
