import { access } from "node:fs/promises";
import { dirname, join, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type LoadedActaProject,
  loadProject,
  type ValidationResult,
  validateProject,
} from "@acta/core";
import { sortDocumentsByNewest } from "./documents.js";

export interface ActaWebData {
  project: LoadedActaProject;
  validation: ValidationResult;
}

let cachedData: Promise<ActaWebData> | undefined;

export async function loadActaWebData(startDir = defaultStartDir()): Promise<ActaWebData> {
  cachedData ??= loadUncachedActaWebData(startDir);
  return cachedData;
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

async function loadUncachedActaWebData(startDir: string): Promise<ActaWebData> {
  const configPath = await getActaConfigPath(startDir);
  const project = await loadProject({ configPath });
  const validation = validateProject(project);

  project.documents = sortDocumentsByNewest(project.documents);

  return {
    project,
    validation,
  };
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
