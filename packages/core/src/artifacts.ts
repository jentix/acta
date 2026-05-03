import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { LoadedActaProject, LoadProjectOptions } from "./project.js";
import { loadProject } from "./project.js";
import type { ActaDocument } from "./schema.js";
import { validateProject, type ValidationResult } from "./validation.js";

export const schemaVersion = "1.0.0";
export const parserVersion = "1.0.0";
export const toolVersion = "0.0.0";

export interface SearchIndexArtifact {
  schemaVersion: string;
  documents: SearchIndexDocument[];
}

export interface SearchIndexDocument {
  id: string;
  kind: "adr" | "spec";
  status: string;
  date: string;
  href: string;
  title: string;
  summary: string;
  tags: string[];
  components: string[];
  owners: string[];
  sectionsText: string;
  bodyText: string;
}

export interface BuildManifest {
  schemaVersion: string;
  parserVersion: string;
  toolVersion: string;
  builtAt: string;
  configHash: string;
  documentCount: number;
  warningCount: number;
  errorCount: number;
}

export interface ContentCache {
  schemaVersion: string;
  parserVersion: string;
  configHash: string;
  entries: Array<{
    path: string;
    contentHash: string;
  }>;
}

export interface BuildArtifactsResult {
  project: LoadedActaProject;
  validation: ValidationResult;
  manifest: BuildManifest;
  searchIndex: SearchIndexArtifact;
}

export async function buildArtifacts(
  options: LoadProjectOptions = {},
): Promise<BuildArtifactsResult> {
  const project = await loadProject(options);
  const validation = validateProject(project);
  const configHash = stableHash({
    docs: project.config.docs,
    ids: project.config.ids,
    validation: project.config.validation,
    build: project.config.build,
  });
  const manifest: BuildManifest = {
    schemaVersion,
    parserVersion,
    toolVersion,
    builtAt: new Date().toISOString(),
    configHash,
    documentCount: project.documents.length,
    warningCount: validation.warningCount,
    errorCount: validation.errorCount,
  };
  const searchIndex = buildSearchIndex(project.documents);
  const cache: ContentCache = {
    schemaVersion,
    parserVersion,
    configHash,
    entries: project.documents.map((document) => ({
      path: document.file.path,
      contentHash: document.file.contentHash,
    })),
  };

  await mkdir(project.config.resolvedBuild.outDir, { recursive: true });
  await mkdir(project.config.resolvedBuild.cacheDir, { recursive: true });
  await writeJson(join(project.config.resolvedBuild.outDir, "documents.json"), project.documents);
  await writeJson(join(project.config.resolvedBuild.outDir, "graph.json"), project.graph);
  await writeJson(join(project.config.resolvedBuild.outDir, "ordering.json"), project.ordering);
  await writeJson(join(project.config.resolvedBuild.outDir, "search-index.json"), searchIndex);
  await writeJson(join(project.config.resolvedBuild.outDir, "validation.json"), validation);
  await writeJson(join(project.config.resolvedBuild.outDir, "manifest.json"), manifest);
  await writeJson(join(project.config.resolvedBuild.cacheDir, "content-cache.json"), cache);

  return {
    project,
    validation,
    manifest,
    searchIndex,
  };
}

export function buildSearchIndex(documents: ActaDocument[]): SearchIndexArtifact {
  return {
    schemaVersion,
    documents: documents.map((document) => ({
      id: document.id,
      href: `/documents/${encodeURIComponent(document.id)}/`,
      kind: document.kind,
      status: document.status,
      date: document.date,
      title: document.title,
      summary: document.summary ?? "",
      tags: document.tags,
      components: document.component,
      owners: document.owners,
      sectionsText: document.sections
        .map((section) => `${section.title}\n${section.content}`)
        .join("\n\n"),
      bodyText: document.body,
    })),
  };
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function stableHash(value: unknown): string {
  const json = stableStringify(value);
  let hash = 0;
  for (let index = 0; index < json.length; index += 1) {
    hash = (hash * 31 + json.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableStringify(nestedValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
