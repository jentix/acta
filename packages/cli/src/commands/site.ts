import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import type { ResolvedActaConfig } from "@acta-dev/core";
import { buildArtifacts } from "@acta-dev/core";
import { defineCommand } from "citty";
import kleur from "kleur";
import { resolveContext } from "../context.js";
import { exitFailure, printJson, printLine, printSuccess, printWarn } from "../output.js";

export interface SiteOptions {
  outDir: string;
  base?: string;
  site?: string;
}

/** Resolve the effective site output dir + hosting options from config + flags. */
export function resolveSiteOptions(
  config: ResolvedActaConfig,
  args: { out?: string; base?: string; site?: string },
  cwd = process.cwd(),
): SiteOptions {
  return {
    outDir: args.out ? resolve(cwd, args.out) : config.resolvedSite.outDir,
    base: args.base ?? config.site.base,
    site: args.site ?? config.site.url,
  };
}

/** Build the env the Astro build inherits so the viewer reads the user's artifacts. */
export function buildSiteEnv(config: ResolvedActaConfig, options: SiteOptions): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ASTRO_TELEMETRY_DISABLED: "1",
    ACTA_PROJECT_ROOT: config.rootDir,
    ACTA_DIST_DIR: config.resolvedBuild.outDir,
    ACTA_SITE_OUT: options.outDir,
  };
  if (options.base !== undefined) env.ACTA_BASE = options.base;
  if (options.site !== undefined) env.ACTA_SITE = options.site;
  return env;
}

export const siteCommand = defineCommand({
  meta: {
    name: "site",
    description: "Build a deployable static web viewer from your docs into the site output dir",
  },
  args: {
    out: {
      type: "string",
      description: "Output directory for the generated site (default: .acta/site)",
    },
    base: {
      type: "string",
      description: "Base path for hosting under a subpath (e.g. /my-repo for project Pages)",
    },
    site: {
      type: "string",
      description: "Absolute site URL used for canonical links and sitemaps",
    },
    "skip-build": {
      type: "boolean",
      description: "Reuse existing artifacts instead of running `acta build` first",
      default: false,
    },
    config: {
      type: "string",
      alias: "c",
      description: "Path to acta.config.ts",
    },
    json: {
      type: "boolean",
      description: "Print the result as JSON",
      default: false,
    },
  },
  async run({ args }) {
    const { config } = await resolveContext({ config: args.config });
    const json = Boolean(args.json);

    // 1. Produce fresh artifacts in .acta/dist (the viewer's data source).
    let documentCount = 0;
    if (!args["skip-build"]) {
      if (!json) printLine("Building artifacts...");
      const { manifest, validation } = await buildArtifacts({ config });
      documentCount = manifest.documentCount;
      if (validation.errorCount > 0 && !json) {
        printWarn(
          `Building site with ${validation.errorCount} validation error${validation.errorCount !== 1 ? "s" : ""}. Run \`acta validate\` for details.`,
        );
      }
    }

    // 2. Resolve the prebuilt viewer package and Astro's bin.
    const webDir = resolveWebPackageDir();
    if (!webDir) {
      return exitFailure(
        "Could not locate @acta-dev/web. Install it alongside @acta-dev/cli to use `acta site`.",
      );
    }
    const astroBin = resolveAstroBin(webDir);
    if (!astroBin) {
      return exitFailure("Could not locate the Astro binary inside @acta-dev/web.");
    }

    // 3. Compute the site output directory and hosting options.
    const options = resolveSiteOptions(config, args);

    if (!json) printLine("Building static viewer...");

    // 4. Run Astro against the user's artifacts, emitting to outDir.
    const env = buildSiteEnv(config, options);
    const code = await runAstroBuild(astroBin, webDir, env, json);
    if (code !== 0) {
      return exitFailure(`Astro build failed with exit code ${code}.`);
    }

    if (json) {
      printJson({
        ok: true,
        outDir: options.outDir,
        base: options.base ?? null,
        site: options.site ?? null,
        documentCount,
      });
      return;
    }

    printLine();
    printSuccess("Site built");
    printLine(`  ${kleur.bold("Output:")}  ${options.outDir}`);
    if (options.base) printLine(`  ${kleur.bold("Base:")}    ${options.base}`);
    printLine();
    printLine(kleur.dim("Deploy the contents of the output directory to any static host."));
  },
});

export function resolveWebPackageDir(): string | undefined {
  const require = createRequire(import.meta.url);
  try {
    return dirname(require.resolve("@acta-dev/web/package.json"));
  } catch {
    return undefined;
  }
}

export function resolveAstroBin(webDir: string): string | undefined {
  const require = createRequire(join(webDir, "package.json"));
  try {
    const astroPkgJsonPath = require.resolve("astro/package.json");
    const astroPkg = require("astro/package.json") as { bin?: Record<string, string> | string };
    const binRel = typeof astroPkg.bin === "string" ? astroPkg.bin : astroPkg.bin?.astro;
    if (!binRel) return undefined;
    return join(dirname(astroPkgJsonPath), binRel);
  } catch {
    return undefined;
  }
}

function runAstroBuild(
  astroBin: string,
  webDir: string,
  env: NodeJS.ProcessEnv,
  json: boolean,
): Promise<number> {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [astroBin, "build"], {
      cwd: webDir,
      env,
      // Astro logs go to stderr so JSON on stdout stays clean.
      stdio: json ? ["ignore", "ignore", "inherit"] : "inherit",
    });
    child.on("close", (code) => resolvePromise(code ?? 1));
    child.on("error", () => resolvePromise(1));
  });
}
