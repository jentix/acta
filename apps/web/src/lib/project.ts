import { access, readFile } from "node:fs/promises";
import { dirname, join, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ActaDocument,
  DocumentGraph,
  DocumentOrdering,
  ValidationResult,
} from "@acta-dev/core";
import { sortDocumentsByNewest } from "./documents.js";

export interface ActaWebProject {
  documents: ActaDocument[];
  graph: DocumentGraph;
  ordering: DocumentOrdering;
}

export interface ActaWebData {
  project: ActaWebProject;
  validation: ValidationResult;
}

let cachedData: Promise<ActaWebData> | undefined;

export async function loadActaWebData(distDir?: string): Promise<ActaWebData> {
  cachedData ??= loadUncachedActaWebData(distDir);
  return cachedData;
}

/**
 * Resolve the directory holding the `acta build` artifacts.
 *
 * Precedence:
 *  1. explicit argument (used by tests),
 *  2. `ACTA_DIST_DIR` env (set by `acta site` when building outside the monorepo),
 *  3. `<ACTA_PROJECT_ROOT|findActaRoot()>/.acta/dist` (monorepo dev fallback).
 */
export async function resolveDistDir(distDir?: string): Promise<string> {
  if (distDir) {
    return resolve(distDir);
  }

  if (process.env.ACTA_DIST_DIR) {
    return resolve(process.env.ACTA_DIST_DIR);
  }

  const root = process.env.ACTA_PROJECT_ROOT
    ? resolve(process.env.ACTA_PROJECT_ROOT)
    : await findActaRoot();

  return join(root, ".acta", "dist");
}

export async function findActaRoot(startDir = defaultStartDir()): Promise<string> {
  let current = resolve(startDir);
  const root = parse(current).root;

  while (true) {
    const configPath = join(current, "acta.config.ts");
    if (await exists(configPath)) {
      return current;
    }

    if (current === root) {
      throw new Error(`Could not find acta.config.ts from ${startDir}`);
    }

    current = dirname(current);
  }
}

export async function getActaConfigPath(startDir = defaultStartDir()): Promise<string> {
  return join(await findActaRoot(startDir), "acta.config.ts");
}

async function loadUncachedActaWebData(distDir?: string): Promise<ActaWebData> {
  const dir = await resolveDistDir(distDir);

  const [documents, graph, ordering, validation] = await Promise.all([
    readArtifact<ActaDocument[]>(dir, "documents.json"),
    readArtifact<DocumentGraph>(dir, "graph.json"),
    readArtifact<DocumentOrdering>(dir, "ordering.json"),
    readArtifact<ValidationResult>(dir, "validation.json"),
  ]);

  return {
    project: {
      documents: sortDocumentsByNewest(documents),
      graph,
      ordering,
    },
    validation,
  };
}

async function readArtifact<T>(dir: string, file: string): Promise<T> {
  const path = join(dir, file);

  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (cause) {
    throw new Error(
      `Could not read Acta artifact ${path}. Run \`acta build\` before building the site.`,
      { cause },
    );
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function defaultStartDir(): string {
  return dirname(fileURLToPath(import.meta.url));
}
