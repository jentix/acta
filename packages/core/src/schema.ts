import { z } from "zod";

export const documentKinds = ["adr", "spec"] as const;
export const adrStatuses = [
  "proposed",
  "accepted",
  "rejected",
  "deprecated",
  "superseded",
] as const;
export const specStatuses = ["draft", "active", "paused", "implemented", "obsolete"] as const;

export const linkKeys = [
  "related",
  "supersedes",
  "replacedBy",
  "decidedBy",
  "dependsOn",
  "validates",
  "references",
] as const;

export const internalLinkKeys = linkKeys.filter((key) => key !== "references") as Exclude<
  (typeof linkKeys)[number],
  "references"
>[];

const stringArraySchema = z.array(z.string()).default([]);

export const documentLinksSchema = z
  .object({
    related: stringArraySchema.optional(),
    supersedes: stringArraySchema.optional(),
    replacedBy: stringArraySchema.optional(),
    decidedBy: stringArraySchema.optional(),
    dependsOn: stringArraySchema.optional(),
    validates: stringArraySchema.optional(),
    references: stringArraySchema.optional(),
  })
  .default({});

export const baseFrontmatterSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(documentKinds),
  title: z.string().min(1),
  status: z.string().min(1),
  date: z.string().min(1),
  updated: z.string().min(1).optional(),
  tags: stringArraySchema.optional(),
  component: stringArraySchema.optional(),
  owners: stringArraySchema.optional(),
  summary: z.string().optional(),
  links: documentLinksSchema.optional(),
});

export const adrFrontmatterSchema = baseFrontmatterSchema.extend({
  kind: z.literal("adr"),
  status: z.enum(adrStatuses),
});

export const specFrontmatterSchema = baseFrontmatterSchema.extend({
  kind: z.literal("spec"),
  status: z.enum(specStatuses),
});

export const frontmatterSchema = z.discriminatedUnion("kind", [
  adrFrontmatterSchema,
  specFrontmatterSchema,
]);

export type DocumentKind = (typeof documentKinds)[number];
export type AdrStatus = (typeof adrStatuses)[number];
export type SpecStatus = (typeof specStatuses)[number];
export type LinkKey = (typeof linkKeys)[number];
export type InternalLinkKey = Exclude<LinkKey, "references">;
export type DocumentLinkSet = z.infer<typeof documentLinksSchema>;
export type DocumentFrontmatter = z.infer<typeof frontmatterSchema>;

export interface NormalizedLinkSet {
  related: string[];
  supersedes: string[];
  replacedBy: string[];
  decidedBy: string[];
  dependsOn: string[];
  validates: string[];
  references: string[];
}

export interface DocumentSection {
  level: number;
  title: string;
  content: string;
}

export interface DocumentFileMetadata {
  path: string;
  relativePath: string;
  slug: string;
  contentHash: string;
}

export interface NormalizedDocumentBase {
  id: string;
  kind: DocumentKind;
  title: string;
  status: string;
  date: string;
  updated?: string;
  tags: string[];
  component: string[];
  owners: string[];
  summary?: string;
  links: NormalizedLinkSet;
  backlinks: NormalizedLinkSet;
  sections: DocumentSection[];
  body: string;
  file: DocumentFileMetadata;
}

export interface AdrDocument extends NormalizedDocumentBase {
  kind: "adr";
  status: AdrStatus;
}

export interface SpecDocument extends NormalizedDocumentBase {
  kind: "spec";
  status: SpecStatus;
}

export type ActaDocument = AdrDocument | SpecDocument;

export function normalizeLinks(links: DocumentLinkSet | undefined): NormalizedLinkSet {
  return {
    related: [...(links?.related ?? [])],
    supersedes: [...(links?.supersedes ?? [])],
    replacedBy: [...(links?.replacedBy ?? [])],
    decidedBy: [...(links?.decidedBy ?? [])],
    dependsOn: [...(links?.dependsOn ?? [])],
    validates: [...(links?.validates ?? [])],
    references: [...(links?.references ?? [])],
  };
}

export function createEmptyLinks(): NormalizedLinkSet {
  return normalizeLinks(undefined);
}
