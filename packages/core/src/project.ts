import type { ResolvedActaConfig } from "./config.js";
import { type ActaConfigInput, loadConfig, resolveConfig } from "./config.js";
import { buildGraph, type DocumentGraph, deriveBacklinks } from "./graph.js";
import { buildOrderingGraph, type DocumentOrdering } from "./ordering.js";
import { parseMarkdownDocument } from "./parse.js";
import { scanMarkdownFiles } from "./scanner.js";
import type { ActaDocument } from "./schema.js";
import { type ValidationIssue, type ValidationResult, validateProject } from "./validation.js";

export interface LoadedActaProject {
  config: ResolvedActaConfig;
  documents: ActaDocument[];
  graph: DocumentGraph;
  ordering: DocumentOrdering;
  issues: ValidationIssue[];
}

export interface LoadProjectOptions {
  configPath?: string;
  config?: ActaConfigInput | ResolvedActaConfig;
  rootDir?: string;
}

export async function loadProject(options: LoadProjectOptions = {}): Promise<LoadedActaProject> {
  const config = await resolveProjectConfig(options);
  const scannedFiles = await scanMarkdownFiles([
    config.resolvedDocs.adrDir,
    config.resolvedDocs.specDir,
  ]);
  const parseResults = scannedFiles.map((file) =>
    parseMarkdownDocument({
      path: file.path,
      rootDir: config.rootDir,
      content: file.content,
    }),
  );
  const documents = deriveBacklinks(
    parseResults.flatMap((result) => (result.document ? [result.document] : [])),
  );
  const graph = buildGraph(documents);
  const ordering = buildOrderingGraph(documents);
  const issues = parseResults.flatMap((result) => result.issues);

  return {
    config,
    documents,
    graph,
    ordering,
    issues,
  };
}

export async function validateLoadedProject(
  options: LoadProjectOptions = {},
): Promise<ValidationResult> {
  return validateProject(await loadProject(options));
}

async function resolveProjectConfig(options: LoadProjectOptions): Promise<ResolvedActaConfig> {
  if (options.config && "resolvedDocs" in options.config) {
    return options.config;
  }

  if (options.config) {
    return resolveConfig(options.config, { rootDir: options.rootDir });
  }

  if (options.configPath) {
    return loadConfig(options.configPath);
  }

  return resolveConfig({}, { rootDir: options.rootDir });
}
