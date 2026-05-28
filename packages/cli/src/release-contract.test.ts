import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { parse as parseYaml } from "yaml";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T;
}

function readText(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

type PackageJson = {
  name: string;
  version?: string;
  private?: boolean;
  bin?: Record<string, string>;
  files?: string[];
  engines?: Record<string, string>;
  publishConfig?: Record<string, string>;
  scripts?: Record<string, string>;
};

describe("release contract", () => {
  test("marks publishable packages and keeps internal packages private", () => {
    const rootPackage = readJson<PackageJson>("package.json");
    const cliPackage = readJson<PackageJson>("packages/cli/package.json");
    const corePackage = readJson<PackageJson>("packages/core/package.json");
    const rendererPackage = readJson<PackageJson>("packages/renderer/package.json");
    const webPackage = readJson<PackageJson>("apps/web/package.json");

    expect(rootPackage.private).toBe(true);
    expect(rootPackage.scripts?.changeset).toBe("changeset");
    expect(rootPackage.scripts?.["version-packages"]).toBe("changeset version");
    expect(rootPackage.scripts?.release).toBe("changeset publish");

    expect(cliPackage.private).not.toBe(true);
    expect(cliPackage.bin).toEqual({ acta: "./dist/index.js" });
    expect(cliPackage.files).toContain("dist");
    expect(cliPackage.engines?.node).toBe(">=22.12 <26");
    expect(cliPackage.publishConfig?.access).toBe("public");

    expect(corePackage.private).not.toBe(true);
    expect(corePackage.files).toContain("dist");
    expect(corePackage.engines?.node).toBe(">=22.12 <26");
    expect(corePackage.publishConfig?.access).toBe("public");

    expect(rendererPackage.private).toBe(true);
    expect(webPackage.private).toBe(true);
  });

  test("configures Changesets and a root changelog", () => {
    const changesetConfig = readJson<{
      changelog?: string[];
      access?: string;
      baseBranch?: string;
      updateInternalDependencies?: string;
    }>(".changeset/config.json");

    expect(changesetConfig.changelog?.[0]).toBe("@changesets/cli/changelog");
    expect(changesetConfig.access).toBe("public");
    expect(changesetConfig.baseBranch).toBe("main");
    expect(changesetConfig.updateInternalDependencies).toBe("patch");
    expect(existsSync(join(repoRoot, "CHANGELOG.md"))).toBe(true);
    expect(readText("CHANGELOG.md")).toContain("## 0.1.1");
  });

  test("builds the web app for GitHub Pages", () => {
    const astroConfig = readText("apps/web/astro.config.mjs");

    expect(astroConfig).toContain('process.env.GITHUB_PAGES === "true"');
    expect(astroConfig).toContain(
      'site: isPagesBuild ? "https://jentix.github.io" : "http://localhost:4321"',
    );
    expect(astroConfig).toContain('base: isPagesBuild ? "/acta" : undefined');
  });

  test("defines a GitHub Pages deployment workflow", () => {
    const workflow = parseYaml(readText(".github/workflows/deploy-pages.yml")) as {
      name?: string;
      on?: unknown;
      permissions?: Record<string, string>;
      jobs?: Record<string, unknown>;
    };
    const workflowText = readText(".github/workflows/deploy-pages.yml");

    expect(workflow.name).toBe("Deploy Pages");
    expect(workflow.permissions?.contents).toBe("read");
    expect(workflow.permissions?.pages).toBe("write");
    expect(workflow.permissions?.["id-token"]).toBe("write");
    expect(workflow.jobs).toHaveProperty("build");
    expect(workflow.jobs).toHaveProperty("deploy");
    expect(workflowText).toContain("pnpm --filter @acta/cli... build");
    expect(workflowText).toContain("pnpm --filter @acta/cli exec node dist/index.js build");
    expect(workflowText).toContain("pnpm --filter @acta/web build");
    expect(workflowText).toContain('GITHUB_PAGES: "true"');
    expect(workflowText).toContain("apps/web/dist");
  });
});
