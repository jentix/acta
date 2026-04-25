import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

export interface AdrBookConfig {
  title: string;
  decisionsDir: string;
  specsDir: string;
  templatesDir: string;
  outputDir: string;
}

const configSchema = z.object({
  title: z.string().min(1).default("ADR Book"),
  decisionsDir: z.string().min(1).default("docs/decisions"),
  specsDir: z.string().min(1).default("docs/specs"),
  templatesDir: z.string().min(1).default("docs/templates"),
  outputDir: z.string().min(1).default("dist")
});

export function loadConfig(cwd: string): AdrBookConfig {
  const configPath = path.join(cwd, "adr-book.config.json");
  const content = readFileSync(configPath, "utf8");
  return configSchema.parse(JSON.parse(content));
}
