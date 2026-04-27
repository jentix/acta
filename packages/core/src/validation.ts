import { basename } from "node:path";
import type { ResolvedActaConfig } from "./config.js";
import type { ActaDocument, InternalLinkKey } from "./schema.js";
import { internalLinkKeys } from "./schema.js";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  ruleId: string;
  severity: ValidationSeverity;
  message: string;
  documentId?: string;
  path?: string;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  valid: boolean;
}

export interface ProjectLike {
  config: ResolvedActaConfig;
  documents: ActaDocument[];
  issues?: ValidationIssue[];
}

export interface ValidationContext extends ProjectLike {
  documentsById: Map<string, ActaDocument>;
}

export interface ValidationRule {
  id: string;
  severity: ValidationSeverity;
  run(context: ValidationContext): ValidationIssue[];
}

export function validateProject(project: ProjectLike): ValidationResult {
  const context: ValidationContext = {
    ...project,
    documentsById: new Map(project.documents.map((document) => [document.id, document])),
  };
  const issues = [
    ...(project.issues ?? []),
    ...validationRules.flatMap((rule) => rule.run(context)),
  ];
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  return {
    issues,
    errors,
    warnings,
    errorCount: errors.length,
    warningCount: warnings.length,
    valid: errors.length === 0,
  };
}

export const validationRules: ValidationRule[] = [
  {
    id: "id.duplicate",
    severity: "error",
    run: ({ documents }) => {
      const seen = new Map<string, ActaDocument>();
      const issues: ValidationIssue[] = [];
      for (const document of documents) {
        const existing = seen.get(document.id);
        if (existing) {
          issues.push({
            ruleId: "id.duplicate",
            severity: "error",
            message: `Duplicate document id ${document.id}.`,
            documentId: document.id,
            path: document.file.path,
          });
        } else {
          seen.set(document.id, document);
        }
      }
      return issues;
    },
  },
  {
    id: "id.prefix",
    severity: "error",
    run: ({ config, documents }) =>
      documents
        .filter((document) => {
          const prefix = document.kind === "adr" ? config.ids.adrPrefix : config.ids.specPrefix;
          return !document.id.startsWith(`${prefix}-`);
        })
        .map((document) => ({
          ruleId: "id.prefix",
          severity: "error",
          message: `${document.id} does not match ${document.kind} prefix.`,
          documentId: document.id,
          path: document.file.path,
        })),
  },
  {
    id: "filename.id",
    severity: "error",
    run: ({ documents }) =>
      documents
        .filter((document) => !basename(document.file.path, ".md").startsWith(`${document.id}-`))
        .map((document) => ({
          ruleId: "filename.id",
          severity: "error",
          message: `Filename must start with ${document.id}- and include a slug.`,
          documentId: document.id,
          path: document.file.path,
        })),
  },
  {
    id: "links.internal",
    severity: "error",
    run: ({ documents, documentsById }) =>
      documents.flatMap((document) =>
        internalLinkKeys.flatMap((key) =>
          document.links[key]
            .filter((targetId) => !documentsById.has(targetId))
            .map((targetId) => ({
              ruleId: "links.internal",
              severity: "error",
              message: `${document.id} has broken ${key} link to ${targetId}.`,
              documentId: document.id,
              path: document.file.path,
            })),
        ),
      ),
  },
  {
    id: "links.references",
    severity: "error",
    run: ({ documents }) =>
      documents.flatMap((document) =>
        document.links.references
          .filter((reference) => !isValidHttpUrl(reference))
          .map((reference) => ({
            ruleId: "links.references",
            severity: "error",
            message: `${reference} is not a valid external URL.`,
            documentId: document.id,
            path: document.file.path,
          })),
      ),
  },
  {
    id: "sections.required",
    severity: "warning",
    run: ({ config, documents }) =>
      documents.flatMap((document) => {
        const required = config.validation.requiredSections[document.kind];
        const existing = new Set(document.sections.map((section) => normalizeTitle(section.title)));
        return required
          .filter((title) => !existing.has(normalizeTitle(title)))
          .map((title) => ({
            ruleId: "sections.required",
            severity: "warning",
            message: `${document.id} is missing required section # ${title}.`,
            documentId: document.id,
            path: document.file.path,
          }));
      }),
  },
  {
    id: "supersedes.cycle",
    severity: "error",
    run: ({ documents }) => detectCycles(documents, "supersedes"),
  },
  {
    id: "superseded.replacement",
    severity: "error",
    run: ({ documents }) =>
      documents
        .filter((document) => document.kind === "adr")
        .filter((document) => document.status === "superseded")
        .filter(
          (document) =>
            document.links.replacedBy.length === 0 && document.backlinks.supersedes.length === 0,
        )
        .map((document) => ({
          ruleId: "superseded.replacement",
          severity: "error",
          message: `${document.id} is superseded but has no replacement relationship.`,
          documentId: document.id,
          path: document.file.path,
        })),
  },
  {
    id: "supersedes.asymmetric",
    severity: "error",
    run: ({ config, documentsById, documents }) => {
      if (config.validation.asymmetricSupersedes === "off") {
        return [];
      }
      const severity = config.validation.asymmetricSupersedes;
      return documents.flatMap((document) =>
        document.links.replacedBy
          .filter((targetId) => {
            const target = documentsById.get(targetId);
            return !target?.links.supersedes.includes(document.id);
          })
          .map((targetId) => ({
            ruleId: "supersedes.asymmetric",
            severity,
            message: `${document.id} replacedBy ${targetId} is not mirrored by supersedes.`,
            documentId: document.id,
            path: document.file.path,
          })),
      );
    },
  },
  {
    id: "spec.implemented.links",
    severity: "warning",
    run: ({ documents }) =>
      documents
        .filter((document) => document.kind === "spec")
        .filter((document) => document.status === "implemented")
        .filter(
          (document) =>
            document.links.decidedBy.length === 0 && document.links.validates.length === 0,
        )
        .map((document) => ({
          ruleId: "spec.implemented.links",
          severity: "warning",
          message: `${document.id} is implemented but has no decidedBy or validates links.`,
          documentId: document.id,
          path: document.file.path,
        })),
  },
  {
    id: "documents.orphan",
    severity: "warning",
    run: ({ config, documents }) => {
      if (config.validation.orphanDocuments === "off") {
        return [];
      }
      const severity = config.validation.orphanDocuments;
      return documents
        .filter(
          (document) =>
            internalLinkKeys.every((key) => document.links[key].length === 0) &&
            internalLinkKeys.every((key) => document.backlinks[key].length === 0),
        )
        .map((document) => ({
          ruleId: "documents.orphan",
          severity,
          message: `${document.id} has no incoming or outgoing internal links.`,
          documentId: document.id,
          path: document.file.path,
        }));
    },
  },
  {
    id: "owners.allowlist",
    severity: "warning",
    run: ({ config, documents }) => {
      if (!config.validation.owners) {
        return [];
      }
      const allowed = new Set(config.validation.owners);
      return documents.flatMap((document) =>
        document.owners
          .filter((owner) => !allowed.has(owner))
          .map((owner) => ({
            ruleId: "owners.allowlist",
            severity: "warning",
            message: `${owner} is not listed in the configured owners allowlist.`,
            documentId: document.id,
            path: document.file.path,
          })),
      );
    },
  },
];

function detectCycles(documents: ActaDocument[], linkKey: InternalLinkKey): ValidationIssue[] {
  const documentsById = new Map(documents.map((document) => [document.id, document]));
  const issues: ValidationIssue[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (document: ActaDocument, trail: string[]) => {
    if (visiting.has(document.id)) {
      const cycleStart = trail.indexOf(document.id);
      const cycle = [...trail.slice(cycleStart), document.id].join(" -> ");
      issues.push({
        ruleId: `${linkKey}.cycle`,
        severity: "error",
        message: `Cycle detected: ${cycle}.`,
        documentId: document.id,
        path: document.file.path,
      });
      return;
    }
    if (visited.has(document.id)) {
      return;
    }

    visiting.add(document.id);
    for (const targetId of document.links[linkKey]) {
      const target = documentsById.get(targetId);
      if (target) {
        visit(target, [...trail, document.id]);
      }
    }
    visiting.delete(document.id);
    visited.add(document.id);
  };

  for (const document of documents) {
    visit(document, []);
  }

  return issues;
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
