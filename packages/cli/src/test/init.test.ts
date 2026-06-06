import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFixture } from "./fixture.js";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function runInit(
  root: string,
  args: {
    yes?: boolean;
    hooks?: boolean;
    "github-action"?: boolean;
    deploy?: string;
    config?: string;
  },
): Promise<void> {
  const origCwd = process.cwd;
  process.cwd = () => root;

  try {
    const { initCommand } = await import("../commands/init.js");
    const run = initCommand.run;
    if (!run) throw new Error("init command run handler is missing");

    await run({
      args: {
        _: [],
        yes: args.yes ?? true,
        y: args.yes ?? true,
        hooks: args.hooks ?? false,
        "github-action": args["github-action"] ?? false,
        deploy: args.deploy,
        config: args.config,
        c: args.config,
      },
    } as never);
  } finally {
    process.cwd = origCwd;
  }
}

describe("acta init workflow templates", () => {
  it("does not install hooks or GitHub Actions without explicit flags", async () => {
    const fixture = await createFixture();
    try {
      await runInit(fixture.root, {});

      expect(await exists(join(fixture.root, "lefthook.yml"))).toBe(false);
      expect(await exists(join(fixture.root, ".github/workflows/acta-ci.yml"))).toBe(false);
      expect(await exists(join(fixture.root, ".github/workflows/acta-deploy-pages.yml"))).toBe(
        false,
      );
    } finally {
      await fixture.cleanup();
    }
  });

  it("writes only the Lefthook template when --hooks is set", async () => {
    const fixture = await createFixture();
    try {
      await runInit(fixture.root, { hooks: true });

      const lefthook = await readFile(join(fixture.root, "lefthook.yml"), "utf8");
      expect(lefthook).toContain("pre-commit:");
      expect(lefthook).toContain("biome check --write");
      expect(lefthook).toContain("pre-push:");
      expect(lefthook).toContain("pnpm typecheck");
      expect(lefthook).toContain("pnpm test");
      expect(await exists(join(fixture.root, ".github/workflows/acta-ci.yml"))).toBe(false);
    } finally {
      await fixture.cleanup();
    }
  });

  it("writes only the GitHub Actions template when --github-action is set", async () => {
    const fixture = await createFixture();
    try {
      await runInit(fixture.root, { "github-action": true });

      const workflow = await readFile(join(fixture.root, ".github/workflows/acta-ci.yml"), "utf8");
      expect(workflow).toContain("pnpm lint");
      expect(workflow).toContain("pnpm format:check");
      expect(workflow).toContain("pnpm typecheck");
      expect(workflow).toContain("pnpm test");
      expect(workflow).toContain("pnpm build");
      expect(workflow).toContain("pnpm exec acta validate");
      expect(workflow).toContain("pnpm exec acta build");
      expect(await exists(join(fixture.root, "lefthook.yml"))).toBe(false);
    } finally {
      await fixture.cleanup();
    }
  });

  it("writes both workflow templates and creates the workflows directory", async () => {
    const fixture = await createFixture();
    try {
      await runInit(fixture.root, { hooks: true, "github-action": true });

      expect(await exists(join(fixture.root, "lefthook.yml"))).toBe(true);
      expect(await exists(join(fixture.root, ".github/workflows/acta-ci.yml"))).toBe(true);
    } finally {
      await fixture.cleanup();
    }
  });

  it("overwrites existing workflow templates when --yes is set", async () => {
    const fixture = await createFixture();
    try {
      await writeFile(join(fixture.root, "lefthook.yml"), "old hook", "utf8");
      await mkdir(join(fixture.root, ".github/workflows"), { recursive: true });
      await fixture.writeFile(".github/workflows/acta-ci.yml", "old workflow");

      await runInit(fixture.root, { hooks: true, "github-action": true, yes: true });

      expect(await readFile(join(fixture.root, "lefthook.yml"), "utf8")).not.toBe("old hook");
      expect(await readFile(join(fixture.root, ".github/workflows/acta-ci.yml"), "utf8")).not.toBe(
        "old workflow",
      );
    } finally {
      await fixture.cleanup();
    }
  });

  it("writes a GitHub Pages deploy workflow when --deploy=pages is set", async () => {
    const fixture = await createFixture();
    try {
      await runInit(fixture.root, { deploy: "pages" });

      const workflow = await readFile(
        join(fixture.root, ".github/workflows/acta-deploy-pages.yml"),
        "utf8",
      );
      expect(workflow).toContain("pnpm dlx @acta-dev/cli site");
      expect(workflow).toContain(`--base "/\${{ github.event.repository.name }}"`);
      expect(workflow).toContain(".acta/site");
      expect(workflow).toContain("actions/upload-pages-artifact");
      expect(workflow).toContain("actions/deploy-pages");
      expect(workflow).toContain("pages: write");
      expect(workflow).toContain("id-token: write");
    } finally {
      await fixture.cleanup();
    }
  });

  it.each([
    ["cloudflare", "CLOUDFLARE_API_TOKEN"],
    ["vercel", "VERCEL_TOKEN"],
    ["netlify", "NETLIFY_AUTH_TOKEN"],
  ])("writes a %s deploy scaffold with required secrets", async (provider, secretName) => {
    const fixture = await createFixture();
    try {
      await runInit(fixture.root, { deploy: provider });

      const workflow = await readFile(
        join(fixture.root, `.github/workflows/acta-deploy-${provider}.yml`),
        "utf8",
      );
      expect(workflow).toContain("pnpm dlx @acta-dev/cli site");
      expect(workflow).toContain(".acta/site");
      expect(workflow).toContain(secretName);
    } finally {
      await fixture.cleanup();
    }
  });

  it("rejects unknown deploy providers with a usage error", async () => {
    const fixture = await createFixture();
    const originalExit = process.exit;
    const originalStderrWrite = process.stderr.write;
    const stderr: string[] = [];

    process.exit = ((code?: number | string | null) => {
      throw new Error(`process.exit:${code ?? 0}`);
    }) as typeof process.exit;
    process.stderr.write = ((chunk: string | Uint8Array) => {
      stderr.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    try {
      await expect(runInit(fixture.root, { deploy: "ftp" })).rejects.toThrow("process.exit:2");
      expect(stderr.join("")).toContain("Expected --deploy to be one of");
    } finally {
      process.exit = originalExit;
      process.stderr.write = originalStderrWrite;
      await fixture.cleanup();
    }
  });

  it("overwrites an existing deploy workflow when --yes is set", async () => {
    const fixture = await createFixture();
    try {
      await mkdir(join(fixture.root, ".github/workflows"), { recursive: true });
      await fixture.writeFile(".github/workflows/acta-deploy-pages.yml", "old deploy workflow");

      await runInit(fixture.root, { deploy: "pages", yes: true });

      expect(
        await readFile(join(fixture.root, ".github/workflows/acta-deploy-pages.yml"), "utf8"),
      ).not.toBe("old deploy workflow");
    } finally {
      await fixture.cleanup();
    }
  });
});
