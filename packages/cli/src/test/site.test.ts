import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSiteEnv,
  previewUrl,
  resolveAstroBin,
  resolveSiteOptions,
  resolveSiteServeOptions,
  resolveStaticSiteResponse,
  resolveWebPackageDir,
  siteCommand,
} from "../commands/site.js";
import { createFixture } from "./fixture.js";

describe("acta site — option resolution", () => {
  it("defaults the output dir to config.resolvedSite.outDir", async () => {
    const fixture = await createFixture();
    try {
      const options = resolveSiteOptions(fixture.config, {});
      expect(options.outDir).toBe(fixture.config.resolvedSite.outDir);
      expect(options.outDir).toBe(join(fixture.root, ".acta", "site"));
    } finally {
      await fixture.cleanup();
    }
  });

  it("resolves --out relative to cwd and lets flags override config", async () => {
    const fixture = await createFixture({ site: { base: "/cfg", url: "https://cfg.example" } });
    try {
      const options = resolveSiteOptions(
        fixture.config,
        { out: "public", base: "/flag", site: "https://flag.example" },
        fixture.root,
      );
      expect(options.outDir).toBe(join(fixture.root, "public"));
      expect(options.base).toBe("/flag");
      expect(options.site).toBe("https://flag.example");
    } finally {
      await fixture.cleanup();
    }
  });

  it("falls back to config site.base/url when flags are absent", async () => {
    const fixture = await createFixture({ site: { base: "/cfg", url: "https://cfg.example" } });
    try {
      const options = resolveSiteOptions(fixture.config, {}, fixture.root);
      expect(options.base).toBe("/cfg");
      expect(options.site).toBe("https://cfg.example");
    } finally {
      await fixture.cleanup();
    }
  });
});

describe("acta site — serve options", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults local preview to 127.0.0.1:4321", () => {
    expect(resolveSiteServeOptions({})).toEqual({ host: "127.0.0.1", port: 4321 });
  });

  it("lets flags override the host and port", () => {
    expect(resolveSiteServeOptions({ host: "0.0.0.0", port: "5173" })).toEqual({
      host: "0.0.0.0",
      port: 5173,
    });
  });

  it("rejects invalid ports", () => {
    expect(() => resolveSiteServeOptions({ port: "99999" })).toThrow(
      "Expected --port to be an integer between 0 and 65535.",
    );
  });

  it("rejects --json with --serve before building", async () => {
    const fixture = await createFixture();
    const origCwd = process.cwd;
    process.cwd = () => fixture.root;
    vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });

    try {
      await expect(
        // @ts-expect-error citty internal
        siteCommand.run({
          args: {
            _: [],
            out: undefined,
            base: undefined,
            site: undefined,
            "skip-build": false,
            c: undefined,
            config: undefined,
            host: undefined,
            json: true,
            port: undefined,
            serve: true,
          } as never,
        }),
      ).rejects.toThrow("process.exit(2)");
    } finally {
      process.cwd = origCwd;
      await fixture.cleanup();
    }
  });
});

describe("acta site — build env", () => {
  it("points the viewer at the user's artifacts and output dir", async () => {
    const fixture = await createFixture();
    try {
      const options = resolveSiteOptions(fixture.config, { base: "/x" }, fixture.root);
      const env = buildSiteEnv(fixture.config, options);
      expect(env.ACTA_PROJECT_ROOT).toBe(fixture.config.rootDir);
      expect(env.ACTA_DIST_DIR).toBe(fixture.config.resolvedBuild.outDir);
      expect(env.ACTA_SITE_OUT).toBe(options.outDir);
      expect(env.ACTA_BASE).toBe("/x");
      expect(env.ASTRO_TELEMETRY_DISABLED).toBe("1");
    } finally {
      await fixture.cleanup();
    }
  });

  it("omits ACTA_BASE/ACTA_SITE when unset", async () => {
    const fixture = await createFixture();
    try {
      const env = buildSiteEnv(
        fixture.config,
        resolveSiteOptions(fixture.config, {}, fixture.root),
      );
      expect(env.ACTA_BASE).toBeUndefined();
      expect(env.ACTA_SITE).toBeUndefined();
    } finally {
      await fixture.cleanup();
    }
  });
});

describe("acta site — static preview server", () => {
  it("resolves index files, assets, base paths and rejects traversal", async () => {
    const root = await mkdtemp(join(tmpdir(), "acta-site-serve-"));
    await mkdir(join(root, "docs"), { recursive: true });
    await mkdir(join(root, "_astro"), { recursive: true });
    await writeFile(join(root, "index.html"), "<h1>Home</h1>", "utf8");
    await writeFile(join(root, "docs", "index.html"), "<h1>Docs</h1>", "utf8");
    await writeFile(join(root, "_astro", "app.js"), "console.log('ok');", "utf8");

    try {
      const home = await resolveStaticSiteResponse({
        root,
        base: "/repo",
        method: "GET",
        url: "/repo/",
      });
      expect(home.status).toBe(200);
      expect(home.path).toBe(join(root, "index.html"));

      const nested = await resolveStaticSiteResponse({
        root,
        base: "/repo",
        method: "GET",
        url: "/repo/docs/",
      });
      expect(nested.status).toBe(200);
      expect(nested.path).toBe(join(root, "docs", "index.html"));

      const asset = await resolveStaticSiteResponse({
        root,
        base: "/repo",
        method: "GET",
        url: "/repo/_astro/app.js",
      });
      expect(asset.status).toBe(200);
      expect(asset.contentType).toContain("text/javascript");
      expect(asset.path).toBe(join(root, "_astro", "app.js"));

      const outsideBase = await resolveStaticSiteResponse({
        root,
        base: "/repo",
        method: "GET",
        url: "/",
      });
      expect(outsideBase.status).toBe(404);

      const traversal = await resolveStaticSiteResponse({
        root,
        base: "/repo",
        method: "GET",
        url: "/repo/%2e%2e/package.json",
      });
      expect(traversal.status).not.toBe(200);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("formats preview URLs with and without a base path", () => {
    expect(previewUrl("127.0.0.1", 4321)).toBe("http://127.0.0.1:4321/");
    expect(previewUrl("127.0.0.1", 4321, "/repo")).toBe("http://127.0.0.1:4321/repo/");
    expect(previewUrl("127.0.0.1", 4321, "repo/")).toBe("http://127.0.0.1:4321/repo/");
  });
});

describe("acta site — viewer resolution", () => {
  it("resolves the @acta-dev/web package directory", () => {
    const webDir = resolveWebPackageDir();
    expect(webDir).toBeDefined();
    const pkg = JSON.parse(readFileSync(join(webDir as string, "package.json"), "utf8")) as {
      name: string;
    };
    expect(pkg.name).toBe("@acta-dev/web");
  });

  it("resolves an existing Astro binary inside the viewer package", () => {
    const webDir = resolveWebPackageDir() as string;
    const astroBin = resolveAstroBin(webDir);
    expect(astroBin).toBeDefined();
    expect(existsSync(astroBin as string)).toBe(true);
  });
});
