export { buildArtifacts, buildSearchIndex } from "./artifacts.js";
export type {
  BuildArtifactsResult,
  BuildManifest,
  ContentCache,
  SearchIndexEntry,
} from "./artifacts.js";
export {
  actaConfigSchema,
  defineConfig,
  loadConfig,
  resolveConfig,
} from "./config.js";
export type {
  ActaConfig,
  ActaConfigInput,
  ResolvedActaConfig,
} from "./config.js";
export { buildGraph, deriveBacklinks } from "./graph.js";
export type { DocumentGraph, GraphEdge, GraphNode } from "./graph.js";
export { extractSections, hashContent, parseMarkdownDocument } from "./parse.js";
export type { ParseDocumentInput, ParseDocumentResult } from "./parse.js";
export { loadProject, validateLoadedProject } from "./project.js";
export type { LoadedActaProject, LoadProjectOptions } from "./project.js";
export {
  adrFrontmatterSchema,
  adrStatuses,
  baseFrontmatterSchema,
  createEmptyLinks,
  documentKinds,
  documentLinksSchema,
  frontmatterSchema,
  internalLinkKeys,
  linkKeys,
  normalizeLinks,
  specFrontmatterSchema,
  specStatuses,
} from "./schema.js";
export type {
  ActaDocument,
  AdrDocument,
  AdrStatus,
  DocumentFileMetadata,
  DocumentFrontmatter,
  DocumentKind,
  DocumentLinkSet,
  DocumentSection,
  InternalLinkKey,
  LinkKey,
  NormalizedDocumentBase,
  NormalizedLinkSet,
  SpecDocument,
  SpecStatus,
} from "./schema.js";
export {
  validateProject,
  validationRules,
} from "./validation.js";
export type {
  ProjectLike,
  ValidationContext,
  ValidationIssue,
  ValidationResult,
  ValidationRule,
  ValidationSeverity,
} from "./validation.js";

export const actaCorePackage = "@acta/core";
