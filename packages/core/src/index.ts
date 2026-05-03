export type {
  BuildArtifactsResult,
  BuildManifest,
  ContentCache,
  SearchIndexArtifact,
  SearchIndexDocument,
} from "./artifacts.js";
export { buildArtifacts, buildSearchIndex } from "./artifacts.js";
export type {
  ActaConfig,
  ActaConfigInput,
  ResolvedActaConfig,
} from "./config.js";
export {
  actaConfigSchema,
  defineConfig,
  loadConfig,
  resolveConfig,
} from "./config.js";
export type { DocumentGraph, GraphEdge, GraphNode } from "./graph.js";
export { buildGraph, deriveBacklinks } from "./graph.js";
export type {
  DependencyLayer,
  DependencySortOptions,
  DependencyTieBreaker,
  DocumentOrdering,
  OrderingCycle,
  OrderingGraphEdge,
  OrderingGraphNode,
  OrderingLinkKey,
} from "./ordering.js";
export {
  buildDependencyLayers,
  buildOrderingGraph,
  sortDocumentsByDependency,
} from "./ordering.js";
export type { ParseDocumentInput, ParseDocumentResult } from "./parse.js";
export { extractSections, hashContent, parseMarkdownDocument } from "./parse.js";
export type { LoadedActaProject, LoadProjectOptions } from "./project.js";
export { loadProject, validateLoadedProject } from "./project.js";
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
  ProjectLike,
  ValidationContext,
  ValidationIssue,
  ValidationResult,
  ValidationRule,
  ValidationSeverity,
} from "./validation.js";
export {
  validateProject,
  validationRules,
} from "./validation.js";

export const actaCorePackage = "@acta/core";
