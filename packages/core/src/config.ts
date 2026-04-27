import { existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

const severityActionSchema = z.enum(["off", "warning", "error"]);
const defaultDocs = {
  adrDir: "docs/decisions",
  specDir: "docs/specs",
  templatesDir: "docs/templates",
};
const defaultIds = {
  adrPrefix: "ADR",
  specPrefix: "SPEC",
  width: 4,
};
const defaultRequiredSections = {
  adr: ["Context", "Decision", "Consequences"],
  spec: ["Summary", "Goals", "Requirements"],
};
const defaultValidation = {
  draftMaxAgeDays: 30,
  requiredSections: defaultRequiredSections,
  orphanDocuments: "warning" as const,
  asymmetricSupersedes: "error" as const,
};
const defaultBuild = {
  outDir: ".acta/dist",
  cacheDir: ".acta/cache",
};

export const actaConfigSchema = z.object({
  docs: z
    .object({
      adrDir: z.string().default("docs/decisions"),
      specDir: z.string().default("docs/specs"),
      templatesDir: z.string().default("docs/templates"),
    })
    .default(defaultDocs),
  ids: z
    .object({
      adrPrefix: z.string().default("ADR"),
      specPrefix: z.string().default("SPEC"),
      width: z.number().int().positive().default(4),
    })
    .default(defaultIds),
  validation: z
    .object({
      draftMaxAgeDays: z.number().int().positive().default(30),
      requiredSections: z
        .object({
          adr: z.array(z.string()).default(["Context", "Decision", "Consequences"]),
          spec: z.array(z.string()).default(["Summary", "Goals", "Requirements"]),
        })
        .default(defaultRequiredSections),
      orphanDocuments: severityActionSchema.default("warning"),
      asymmetricSupersedes: severityActionSchema.default("error"),
      owners: z.array(z.string()).optional(),
    })
    .default(defaultValidation),
  build: z
    .object({
      outDir: z.string().default(".acta/dist"),
      cacheDir: z.string().default(".acta/cache"),
    })
    .default(defaultBuild),
});

export type ActaConfigInput = z.input<typeof actaConfigSchema>;
export type ActaConfig = z.output<typeof actaConfigSchema>;

export interface ResolvedActaConfig extends ActaConfig {
  rootDir: string;
  configPath?: string;
  resolvedDocs: {
    adrDir: string;
    specDir: string;
    templatesDir: string;
  };
  resolvedBuild: {
    outDir: string;
    cacheDir: string;
  };
}

export function defineConfig(config: ActaConfigInput): ActaConfigInput {
  return config;
}

export function resolveConfig(
  input: ActaConfigInput = {},
  options: { configPath?: string; rootDir?: string } = {},
): ResolvedActaConfig {
  const parsed = actaConfigSchema.parse(input);
  const rootDir = options.configPath
    ? dirname(resolve(options.configPath))
    : resolve(options.rootDir ?? process.cwd());

  const resolveFromRoot = (path: string) => (isAbsolute(path) ? path : resolve(rootDir, path));

  return {
    ...parsed,
    rootDir,
    configPath: options.configPath ? resolve(options.configPath) : undefined,
    resolvedDocs: {
      adrDir: resolveFromRoot(parsed.docs.adrDir),
      specDir: resolveFromRoot(parsed.docs.specDir),
      templatesDir: resolveFromRoot(parsed.docs.templatesDir),
    },
    resolvedBuild: {
      outDir: resolveFromRoot(parsed.build.outDir),
      cacheDir: resolveFromRoot(parsed.build.cacheDir),
    },
  };
}

export async function loadConfig(configPath = "acta.config.ts"): Promise<ResolvedActaConfig> {
  const resolvedPath = resolve(configPath);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Acta config not found: ${resolvedPath}`);
  }

  const imported = (await import(pathToFileURL(resolvedPath).href)) as {
    default?: ActaConfigInput;
  };

  return resolveConfig(imported.default ?? {}, { configPath: resolvedPath });
}
