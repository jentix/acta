import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildSiteEnv,
  resolveAstroBin,
  resolveSiteOptions,
  resolveWebPackageDir,
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
