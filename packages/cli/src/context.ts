import { loadConfig, resolveConfig } from "@acta/core";
import type { ResolvedActaConfig } from "@acta/core";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

export interface CliContext {
  config: ResolvedActaConfig;
  cwd: string;
}

export async function resolveContext(opts: {
  config?: string;
  cwd?: string;
}): Promise<CliContext> {
  const cwd = resolve(opts.cwd ?? process.cwd());

  if (opts.config) {
    const config = await loadConfig(opts.config);
    return { config, cwd };
  }

  // Search for acta.config.ts from cwd upward (up to 3 levels)
  for (const dir of [cwd, join(cwd, ".."), join(cwd, "../..")]) {
    const candidate = join(dir, "acta.config.ts");
    if (existsSync(candidate)) {
      const config = await loadConfig(candidate);
      return { config, cwd };
    }
  }

  // No config file found — use defaults resolved from cwd
  const config = resolveConfig({}, { rootDir: cwd });
  return { config, cwd };
}
