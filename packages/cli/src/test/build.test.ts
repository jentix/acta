import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adrContent, createFixture } from "./fixture.js";

vi.spyOn(process, "exit").mockImplementation((code) => {
  throw new Error(`process.exit(${code})`);
});

describe("acta build", () => {
  let origCwd: () => string;

  beforeEach(() => {
    origCwd = process.cwd;
  });

  afterEach(() => {
    process.cwd = origCwd;
    vi.restoreAllMocks();
  });

  it("writes all artifact files to outDir", async () => {
    const fixture = await createFixture();
    try {
      await fixture.writeAdr("ADR-0001-one.md", adrContent());

      process.cwd = () => fixture.root;

      const { buildCommand } = await import("../commands/build.js");
      // @ts-expect-error citty internal
      await buildCommand.run({ args: { config: undefined } });

      const outDir = fixture.config.resolvedBuild.outDir;
      expect(existsSync(join(outDir, "documents.json"))).toBe(true);
      expect(existsSync(join(outDir, "graph.json"))).toBe(true);
      expect(existsSync(join(outDir, "search-index.json"))).toBe(true);
      expect(existsSync(join(outDir, "search-index-full.json"))).toBe(true);
      expect(existsSync(join(outDir, "validation.json"))).toBe(true);
      expect(existsSync(join(outDir, "manifest.json"))).toBe(true);
    } finally {
      await fixture.cleanup();
    }
  });

  it("prints the manifest as JSON with --json", async () => {
    const fixture = await createFixture();
    try {
      await fixture.writeAdr("ADR-0001-one.md", adrContent());

      process.cwd = () => fixture.root;

      vi.spyOn(process, "exit").mockImplementation((code) => {
        throw new Error(`process.exit(${code})`);
      });

      const chunks: string[] = [];
      const writeSpy = vi
        .spyOn(process.stdout, "write")
        .mockImplementation((chunk: string | Uint8Array) => {
          chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
          return true;
        });

      const { buildCommand } = await import("../commands/build.js");
      // build exits 0 on success; the mocked process.exit throws.
      await expect(
        // @ts-expect-error citty internal
        buildCommand.run({ args: { config: undefined, json: true } }),
      ).rejects.toThrow("process.exit(0)");

      writeSpy.mockRestore();

      const payload = JSON.parse(chunks.join("")) as {
        documentCount: number;
        errorCount: number;
        outDir: string;
      };
      expect(payload.documentCount).toBe(1);
      expect(payload.errorCount).toBe(0);
      expect(payload.outDir).toBe(fixture.config.resolvedBuild.outDir);
    } finally {
      await fixture.cleanup();
    }
  });

  it("manifest has correct document count", async () => {
    const fixture = await createFixture();
    try {
      await fixture.writeAdr("ADR-0001-one.md", adrContent());

      process.cwd = () => fixture.root;

      const { buildCommand } = await import("../commands/build.js");
      // @ts-expect-error citty internal
      await buildCommand.run({ args: { config: undefined } });

      const { readFile } = await import("node:fs/promises");
      const manifest = JSON.parse(
        await readFile(join(fixture.config.resolvedBuild.outDir, "manifest.json"), "utf8"),
      ) as { documentCount: number; errorCount: number };

      expect(manifest.documentCount).toBe(1);
      expect(manifest.errorCount).toBe(0);
    } finally {
      await fixture.cleanup();
    }
  });
});
