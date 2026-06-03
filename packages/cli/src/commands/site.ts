import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { createRequire } from "node:module";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import type { ResolvedActaConfig } from "@acta-dev/core";
import { buildArtifacts } from "@acta-dev/core";
import { defineCommand } from "citty";
import kleur from "kleur";
import { resolveContext } from "../context.js";
import {
  exitFailure,
  exitUsage,
  printJson,
  printLine,
  printSuccess,
  printWarn,
} from "../output.js";

export interface SiteOptions {
  outDir: string;
  base?: string;
  site?: string;
}

export interface SiteServeOptions {
  host: string;
  port: number;
}

export interface StaticSiteServer {
  server: Server;
  url: string;
  close(): Promise<void>;
}

export interface StaticSiteResponse {
  status: number;
  contentType: string;
  contentLength?: number;
  path?: string;
  text?: string;
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

export function resolveSiteServeOptions(args: {
  host?: string;
  port?: string | number;
}): SiteServeOptions {
  const port = args.port === undefined ? 4321 : Number(args.port);

  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error("Expected --port to be an integer between 0 and 65535.");
  }

  return {
    host: args.host ?? "127.0.0.1",
    port,
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
    serve: {
      type: "boolean",
      description: "Serve the generated site locally after building it",
      default: false,
    },
    host: {
      type: "string",
      description: "Host for --serve (default: 127.0.0.1)",
    },
    port: {
      type: "string",
      description: "Port for --serve (default: 4321)",
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
    const serve = Boolean(args.serve);

    if (json && serve) {
      return exitUsage("`acta site --serve` cannot be combined with --json.");
    }

    let serveOptions: SiteServeOptions | undefined;
    if (serve) {
      try {
        serveOptions = resolveSiteServeOptions(args);
      } catch (error) {
        return exitUsage(error instanceof Error ? error.message : String(error));
      }
    }

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

    if (serveOptions) {
      try {
        const preview = await serveStaticSite({
          root: options.outDir,
          base: options.base,
          ...serveOptions,
        });
        printLine(`  ${kleur.bold("Serving:")} ${preview.url}`);
        printLine();
        printLine(kleur.dim("Press Ctrl+C to stop the preview server."));
        await waitForShutdown(preview);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return exitFailure(message);
      }
    }

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

const mimeTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webp": "image/webp",
};

export function previewUrl(host: string, port: number, base?: string): string {
  const basePath = normalizeBasePath(base);
  const path = basePath === "/" ? "/" : `${basePath}/`;
  return `http://${host}:${port}${path}`;
}

export async function serveStaticSite(options: {
  root: string;
  host: string;
  port: number;
  base?: string;
}): Promise<StaticSiteServer> {
  const root = resolve(options.root);
  const basePath = normalizeBasePath(options.base);

  const server = createServer(async (request, response) => {
    const result = await resolveStaticSiteResponse({
      root,
      base: basePath,
      method: request.method ?? "GET",
      url: request.url ?? "/",
    });

    if (!result.path) {
      if (request.method === "HEAD") {
        response.statusCode = result.status;
        response.setHeader("Content-Type", result.contentType);
        response.end();
        return;
      }
      sendText(response, result.status, result.text ?? "Not Found");
      return;
    }

    response.statusCode = result.status;
    response.setHeader("Content-Type", result.contentType);
    if (result.contentLength !== undefined) {
      response.setHeader("Content-Length", String(result.contentLength));
    }

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    createReadStream(result.path).pipe(response);
  });

  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => {
      server.off("error", reject);
      resolvePromise();
    });
  }).catch((error) => {
    if (isAddressInUse(error)) {
      throw new Error(
        `Port ${options.port} is already in use on ${options.host}. Try a different --port.`,
      );
    }
    throw error;
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : options.port;

  return {
    server,
    url: previewUrl(options.host, port, options.base),
    close: () =>
      new Promise((resolvePromise, reject) => {
        server.close((error) => (error ? reject(error) : resolvePromise()));
      }),
  };
}

export async function resolveStaticSiteResponse(options: {
  root: string;
  base?: string;
  method: string;
  url: string;
}): Promise<StaticSiteResponse> {
  if (options.method !== "GET" && options.method !== "HEAD") {
    return {
      status: 405,
      contentType: "text/plain; charset=utf-8",
      text: "Method Not Allowed",
    };
  }

  const root = resolve(options.root);
  const basePath = normalizeBasePath(options.base);
  const filePath = await resolveRequestPath(root, basePath, options.url);
  if (!filePath) {
    return { status: 404, contentType: "text/plain; charset=utf-8", text: "Not Found" };
  }

  try {
    const fileStat = await stat(filePath);
    const finalPath = fileStat.isDirectory() ? join(filePath, "index.html") : filePath;
    const finalStat = fileStat.isDirectory() ? await stat(finalPath) : fileStat;

    if (!finalStat.isFile()) {
      return { status: 404, contentType: "text/plain; charset=utf-8", text: "Not Found" };
    }

    return {
      status: 200,
      contentType: mimeTypes[extname(finalPath)] ?? "application/octet-stream",
      contentLength: finalStat.size,
      path: finalPath,
    };
  } catch {
    return { status: 404, contentType: "text/plain; charset=utf-8", text: "Not Found" };
  }
}

async function resolveRequestPath(
  root: string,
  basePath: string,
  requestUrl: string,
): Promise<string | undefined> {
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  } catch {
    return undefined;
  }

  if (basePath !== "/") {
    if (pathname === basePath) {
      pathname = "/";
    } else if (pathname.startsWith(`${basePath}/`)) {
      pathname = pathname.slice(basePath.length);
    } else {
      return undefined;
    }
  }

  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const candidate = resolve(root, `.${normalized}`);
  const rel = relative(root, candidate);
  if (
    rel === ".." ||
    rel.startsWith(`..${sep}`) ||
    rel === "" ||
    rel.startsWith("/") ||
    rel === "."
  ) {
    return rel === "." || rel === "" ? root : undefined;
  }

  return candidate;
}

function sendText(
  response: import("node:http").ServerResponse,
  status: number,
  text: string,
): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.end(text);
}

function normalizeBasePath(base?: string): string {
  if (!base || base === "/") return "/";
  const withLeading = base.startsWith("/") ? base : `/${base}`;
  return withLeading.replace(/\/+$/, "") || "/";
}

function waitForShutdown(preview: StaticSiteServer): Promise<void> {
  return new Promise((resolvePromise) => {
    const shutdown = async () => {
      process.off("SIGINT", shutdown);
      process.off("SIGTERM", shutdown);
      await preview.close();
      resolvePromise();
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  });
}

function isAddressInUse(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && "code" in error && error.code === "EADDRINUSE"
  );
}
