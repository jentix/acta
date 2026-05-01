import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DocumentKind, ResolvedActaConfig } from "@acta/core";

export interface TemplateVars {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  status: string;
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
  return raw
    .replace(/^(id:\s*).*$/m, `$1${vars.id}`)
    .replace(/^(title:\s*).*$/m, `$1${vars.title}`)
    .replace(/^(date:\s*).*$/m, `$1${vars.date}`)
    .replace(/^(status:\s*).*$/m, `$1${vars.status}`);
}

/** Today's date as YYYY-MM-DD (local timezone). */
export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
