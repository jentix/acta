import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  adrStatuses,
  buildArtifacts,
  buildFullSearchIndex,
  buildSearchIndex,
  type DocumentKind,
  loadProject,
  type ResolvedActaConfig,
  searchDocuments,
  specStatuses,
  validateProject,
} from "@acta-dev/core";
import { notFound } from "./errors.js";

export interface ActaMcpContext {
  rootDir: string;
  config: ResolvedActaConfig;
}

export interface DocumentSummary {
  id: string;
  kind: DocumentKind;
  status: string;
  title: string;
  summary: string;
  tags: string[];
  component: string[];
  owners: string[];
  path: string;
  relativePath: string;
}

export interface ValidationToolResult extends ReturnType<typeof validateProject> {
  ok: boolean;
}

export async function actaNew(
  context: ActaMcpContext,
  input: {
    kind: DocumentKind;
    title: string;
    status?: string;
    tags?: string[];
  },
) {
  const project = await loadProject({ config: context.config });
  const title = input.title.trim();
  const status = input.status ?? (input.kind === "adr" ? "proposed" : "draft");
  const statuses: readonly string[] = input.kind === "adr" ? adrStatuses : specStatuses;

  if (!statuses.includes(status)) {
    throw new Error(
      `Invalid ${input.kind} status "${status}". Valid statuses: ${statuses.join(", ")}`,
    );
  }

  const id = allocateNextId(input.kind, project.documents, context.config);
  const filename = `${id}-${titleToSlug(title)}.md`;
  const dir =
    input.kind === "adr" ? context.config.resolvedDocs.adrDir : context.config.resolvedDocs.specDir;
  const path = join(dir, filename);

  if (existsSync(path)) {
    throw new Error(`File already exists: ${path}`);
  }

  const content = await renderTemplate(
    input.kind,
    {
      id,
      title,
      date: new Date().toISOString(),
      status,
      tags: input.tags,
    },
    context.config,
  );
  await writeFile(path, content, "utf8");

  return {
    id,
    kind: input.kind,
    title,
    status,
    path,
    relativePath: relative(context.rootDir, path),
  };
}

export async function actaValidate(context: ActaMcpContext): Promise<ValidationToolResult> {
  const project = await loadProject({ config: context.config });
  const validation = validateProject(project);
  return { ...validation, ok: validation.valid };
}

export async function actaList(
  context: ActaMcpContext,
  filters: {
    kind?: string;
    status?: string;
    tag?: string;
    component?: string;
    owner?: string;
  } = {},
): Promise<DocumentSummary[]> {
  const project = await loadProject({ config: context.config });
  return project.documents
    .filter(
      (document) =>
        (!filters.kind || document.kind === filters.kind) &&
        (!filters.status || document.status === filters.status) &&
        (!filters.tag || document.tags.includes(filters.tag)) &&
        (!filters.component || document.component.includes(filters.component)) &&
        (!filters.owner || document.owners.includes(filters.owner)),
    )
    .map(summarizeDocument);
}

export async function actaShow(context: ActaMcpContext, input: { id: string }) {
  const project = await loadProject({ config: context.config });
  const document = project.documents.find(
    (candidate) => candidate.id.toLowerCase() === input.id.toLowerCase(),
  );

  if (!document) {
    throw notFound(input.id);
  }

  return document;
}

export async function actaGraph(context: ActaMcpContext) {
  const project = await loadProject({ config: context.config });
  return project.graph;
}

export async function actaSearch(
  context: ActaMcpContext,
  input: {
    query: string;
    kind?: string;
    includeContent?: boolean;
  },
): Promise<DocumentSummary[]> {
  const project = await loadProject({ config: context.config });
  const index = input.includeContent
    ? buildFullSearchIndex(project.documents)
    : buildSearchIndex(project.documents);
  const documents = await searchDocuments(index, input.query, { kind: input.kind });
  const byId = new Map(project.documents.map((document) => [document.id, document]));

  return documents
    .map((document) => byId.get(document.id))
    .filter((document) => document !== undefined)
    .map(summarizeDocument);
}

export async function actaBuild(context: ActaMcpContext) {
  const result = await buildArtifacts({ config: context.config });
  return {
    manifest: result.manifest,
    validation: { ...result.validation, ok: result.validation.valid },
  };
}

function summarizeDocument(
  document: Parameters<typeof validateProject>[0]["documents"][number],
): DocumentSummary {
  return {
    id: document.id,
    kind: document.kind,
    status: document.status,
    title: document.title,
    summary: document.summary ?? "",
    tags: document.tags,
    component: document.component,
    owners: document.owners,
    path: document.file.path,
    relativePath: document.file.relativePath,
  };
}

function allocateNextId(
  kind: DocumentKind,
  documents: Array<{ id: string; kind: DocumentKind }>,
  config: ResolvedActaConfig,
): string {
  const prefix = kind === "adr" ? config.ids.adrPrefix : config.ids.specPrefix;
  const width = config.ids.width;
  const max = documents
    .filter((document) => document.kind === kind)
    .map((document) => Number.parseInt(document.id.slice(prefix.length + 1), 10))
    .filter((value) => Number.isFinite(value))
    .reduce((current, value) => Math.max(current, value), 0);

  return `${prefix}-${String(max + 1).padStart(width, "0")}`;
}

function titleToSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function renderTemplate(
  kind: DocumentKind,
  vars: {
    id: string;
    title: string;
    date: string;
    status: string;
    tags?: string[];
  },
  config: ResolvedActaConfig,
): Promise<string> {
  const raw = await readFile(join(config.resolvedDocs.templatesDir, `${kind}.md`), "utf8");
  let rendered = raw
    .replace(/^(id:\s*).*$/m, `$1${vars.id}`)
    .replace(/^(title:\s*).*$/m, `$1${vars.title}`)
    .replace(/^(date:\s*).*$/m, `$1${vars.date}`)
    .replace(/^(status:\s*).*$/m, `$1${vars.status}`);

  if (vars.tags) {
    rendered = rendered.replace(/^(tags:\s*).*$/m, `$1[${vars.tags.join(", ")}]`);
  }

  return rendered;
}
