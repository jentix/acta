import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DocumentKind, ResolvedActaConfig } from "@acta-dev/core";

export interface TemplateVars {
  id: string;
  title: string;
  date: string; // ISO 8601 datetime with offset
  status: string;
  tags?: string[];
}

/**
 * Read the template file for the given kind and interpolate placeholders.
 * Replacements are line-by-line to avoid clobbering body content.
 */
export async function renderTemplate(
  kind: DocumentKind,
  vars: TemplateVars,
  config: ResolvedActaConfig,
): Promise<string> {
  const templateFile = join(config.resolvedDocs.templatesDir, `${kind}.md`);
  const raw = await readFile(templateFile, "utf8");
  return interpolate(raw, vars);
}

function interpolate(raw: string, vars: TemplateVars): string {
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

/** Current instant as ISO 8601 datetime with offset, e.g. `2026-05-24T14:32:11.123Z`. */
export function nowIsoDateTime(): string {
  return new Date().toISOString();
}
