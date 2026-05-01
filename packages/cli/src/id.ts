import type { ActaDocument, DocumentKind, ResolvedActaConfig } from "@acta/core";

/**
 * Given existing documents of the same kind, return the next numeric id string.
 * e.g. if ADR-0001, ADR-0002 exist → "ADR-0003"
 */
export function allocateNextId(
  kind: DocumentKind,
  documents: ActaDocument[],
  config: ResolvedActaConfig,
): string {
  const prefix = kind === "adr" ? config.ids.adrPrefix : config.ids.specPrefix;
  const existing = documents
    .filter((doc) => doc.kind === kind)
    .map((doc) => {
      const match = doc.id.match(/(\d+)$/);
      return match?.[1] !== undefined ? parseInt(match[1], 10) : 0;
    });
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `${prefix}-${String(next).padStart(config.ids.width, "0")}`;
}

/**
 * Parse the numeric part of an id string. Returns NaN if not found.
 */
export function parseIdNumber(id: string): number {
  const match = id.match(/(\d+)$/);
  return match?.[1] !== undefined ? parseInt(match[1], 10) : NaN;
}

/**
 * Extract the prefix from an id string (everything before the last hyphen+digits).
 */
export function parseIdPrefix(id: string): string {
  return id.replace(/-\d+$/, "");
}
