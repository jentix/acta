import { resolve } from "node:path";
import { loadConfig } from "@acta-dev/core";
import type { ActaMcpContext } from "./tools.js";

export interface ResolveMcpContextOptions {
  config?: string;
  cwd?: string;
}

export async function resolveMcpContext(
  options: ResolveMcpContextOptions = {},
): Promise<ActaMcpContext> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const configPath = resolve(cwd, options.config ?? "acta.config.ts");
  const config = await loadConfig(configPath);

  return {
    rootDir: config.rootDir,
    config,
  };
}
