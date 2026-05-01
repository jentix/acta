import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createFixture, adrContent, specContent as makeSpec } from "./fixture.js";

vi.spyOn(process, "exit").mockImplementation((code) => {
  throw new Error(`process.exit(${code})`);
});

describe("acta renumber", () => {
  let origCwd: () => string;

  beforeEach(() => {
    origCwd = process.cwd;
    vi.restoreAllMocks();
    // Re-spy after restore
    vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(() => {
    process.cwd = origCwd;
  });

  it("renames the file and updates frontmatter id", async () => {
    const fixture = await createFixture();
    try {
      await fixture.writeAdr("ADR-0001-old-title.md", adrContent({ id: "ADR-0001", title: "Old Title" }));

      process.cwd = () => fixture.root;

      const { renumberCommand } = await import("../commands/renumber.js");
      // @ts-expect-error citty internal
      await renumberCommand.run({ args: { from: "ADR-0001", to: "ADR-0007", "dry-run": false, config: undefined } });

      const newPath = join(fixture.config.resolvedDocs.adrDir, "ADR-0007-old-title.md");
      expect(existsSync(newPath)).toBe(true);

      const content = await readFile(newPath, "utf8");
      expect(content).toContain("id: ADR-0007");
      expect(content).not.toContain("id: ADR-0001");
    } finally {
      await fixture.cleanup();
    }
  });

  it("updates internal links in other documents", async () => {
    const fixture = await createFixture();
    try {
      await fixture.writeAdr("ADR-0001-target.md", adrContent({ id: "ADR-0001", title: "Target" }));
      await fixture.writeSpec(
        "SPEC-0001-linking.md",
        makeSpec({ id: "SPEC-0001", links: "decidedBy: [ADR-0001]" }),
      );

      process.cwd = () => fixture.root;

      const { renumberCommand } = await import("../commands/renumber.js");
      // @ts-expect-error citty internal
      await renumberCommand.run({ args: { from: "ADR-0001", to: "ADR-0005", "dry-run": false, config: undefined } });

      const specPath = join(fixture.config.resolvedDocs.specDir, "SPEC-0001-linking.md");
      const specFileContent = await readFile(specPath, "utf8");
      expect(specFileContent).toContain("ADR-0005");
      expect(specFileContent).not.toContain("ADR-0001");
    } finally {
      await fixture.cleanup();
    }
  });

  it("dry-run does not write files", async () => {
    const fixture = await createFixture();
    try {
      await fixture.writeAdr("ADR-0001-dry.md", adrContent({ id: "ADR-0001" }));

      process.cwd = () => fixture.root;

      const { renumberCommand } = await import("../commands/renumber.js");
      // @ts-expect-error citty internal
      await renumberCommand.run({ args: { from: "ADR-0001", to: "ADR-0009", "dry-run": true, config: undefined } });

      // Old file still exists
      expect(existsSync(join(fixture.config.resolvedDocs.adrDir, "ADR-0001-dry.md"))).toBe(true);
      // New file does NOT exist
      expect(existsSync(join(fixture.config.resolvedDocs.adrDir, "ADR-0009-dry.md"))).toBe(false);
    } finally {
      await fixture.cleanup();
    }
  });

  it("fails when source id not found", async () => {
    const fixture = await createFixture();
    try {
      process.cwd = () => fixture.root;

      const { renumberCommand } = await import("../commands/renumber.js");
      await expect(
        // @ts-expect-error citty internal
        renumberCommand.run({ args: { from: "ADR-9999", to: "ADR-0001", "dry-run": false, config: undefined } }),
      ).rejects.toThrow();
    } finally {
      await fixture.cleanup();
    }
  });
});
