import { createHash } from "node:crypto";
import { basename, relative } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  type ActaDocument,
  createEmptyLinks,
  type DocumentSection,
  frontmatterSchema,
  normalizeLinks,
} from "./schema.js";
import type { ValidationIssue } from "./validation.js";

export interface ParseDocumentInput {
  path: string;
  rootDir: string;
  content: string;
}

export interface ParseDocumentResult {
  document?: ActaDocument;
  issues: ValidationIssue[];
}

const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function parseMarkdownDocument(input: ParseDocumentInput): ParseDocumentResult {
  const issues: ValidationIssue[] = [];
  const match = input.content.match(frontmatterPattern);

  if (!match) {
    return {
      issues: [
        {
          ruleId: "frontmatter.missing",
          severity: "error",
          message: "Document is missing YAML frontmatter.",
          path: input.path,
        },
      ],
    };
  }

  let rawFrontmatter: unknown;
  try {
    rawFrontmatter = parseYaml(match[1] ?? "");
  } catch (error) {
    return {
      issues: [
        {
          ruleId: "frontmatter.yaml",
          severity: "error",
          message: `Invalid YAML frontmatter: ${formatError(error)}`,
          path: input.path,
        },
      ],
    };
  }

  const parsed = frontmatterSchema.safeParse(rawFrontmatter);
  if (!parsed.success) {
    return {
      issues: parsed.error.issues.map((issue) => ({
        ruleId: "frontmatter.schema",
        severity: "error",
        message: `${issue.path.join(".") || "frontmatter"}: ${issue.message}`,
        path: input.path,
      })),
    };
  }

  const body = input.content.slice(match[0].length).trim();
  const links = normalizeLinks(parsed.data.links);
  const relativePath = relative(input.rootDir, input.path);
  const slug = basename(input.path, ".md");
  const base = {
    id: parsed.data.id,
    kind: parsed.data.kind,
    title: parsed.data.title,
    status: parsed.data.status,
    date: parsed.data.date,
    updated: parsed.data.updated,
    tags: [...(parsed.data.tags ?? [])],
    component: [...(parsed.data.component ?? [])],
    owners: [...(parsed.data.owners ?? [])],
    summary: parsed.data.summary,
    links,
    backlinks: createEmptyLinks(),
    sections: extractSections(body),
    body,
    file: {
      path: input.path,
      relativePath,
      slug,
      contentHash: hashContent(input.content),
    },
  };

  return { document: base as ActaDocument, issues };
}

export function extractSections(body: string): DocumentSection[] {
  const headingPattern = /^(#{1,6})\s+(.+?)\s*#*\s*$/gm;
  const headings = [...body.matchAll(headingPattern)];
  return headings.map((heading, index) => {
    const nextHeading = headings[index + 1];
    const contentStart = (heading.index ?? 0) + heading[0].length;
    const contentEnd = nextHeading?.index ?? body.length;

    return {
      level: heading[1].length,
      title: heading[2].trim(),
      content: body.slice(contentStart, contentEnd).trim(),
    };
  });
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
