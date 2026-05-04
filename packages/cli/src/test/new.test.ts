import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { adrContent, createFixture } from "./fixture.js";

// Prevent process.exit from killing vitest
vi.spyOn(process, "exit").mockImplementation((code) => {
  throw new Error(`process.exit(${code})`);
});

describe("acta new adr", () => {
  it("creates ADR-0001 when no ADRs exist", async () => {
    const fixture = await createFixture();
    try {
      // Temporarily override cwd so context resolution finds config
      const origCwd = process.cwd;
      process.cwd = () => fixture.root;

      const { newCommand } = await import("../commands/new.js");
      // @ts-expect-error citty internal
      await newCommand.subCommands.adr.run({
        args: {
          title: "My First Decision",
          config: undefined,
          id: undefined,
          status: undefined,
          tags: undefined,
        },
      });

      const files = await import("node:fs/promises").then((m) =>
        m.readdir(fixture.config.resolvedDocs.adrDir),
      );
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/^ADR-0001-my-first-decision\.md$/);

      const content = await readFile(
        join(fixture.config.resolvedDocs.adrDir, files[0] ?? ""),
        "utf8",
      );
      expect(content).toContain("id: ADR-0001");
      expect(content).toContain("title: My First Decision");
      expect(content).toContain("kind: adr");

      process.cwd = origCwd;
    } finally {
      await fixture.cleanup();
    }
  });

  it("allocates ADR-0002 when ADR-0001 exists", async () => {
    const fixture = await createFixture();
    try {
      await fixture.writeAdr("ADR-0001-existing.md", adrContent());

      const origCwd = process.cwd;
      process.cwd = () => fixture.root;

      const { newCommand } = await import("../commands/new.js");
      // @ts-expect-error citty internal
      await newCommand.subCommands.adr.run({
        args: {
          title: "Second Decision",
          config: undefined,
          id: undefined,
          status: undefined,
          tags: undefined,
        },
      });

      const files = await import("node:fs/promises").then((m) =>
        m.readdir(fixture.config.resolvedDocs.adrDir),
      );
      expect(files).toContain("ADR-0002-second-decision.md");

      process.cwd = origCwd;
    } finally {
      await fixture.cleanup();
    }
  });

  it("refuses to create when file already exists", async () => {
    const fixture = await createFixture();
    try {
      const origCwd = process.cwd;
      process.cwd = () => fixture.root;

      const { newCommand } = await import("../commands/new.js");
      // Create once
      // @ts-expect-error citty internal
      await newCommand.subCommands.adr.run({
        args: {
          title: "Collision",
          config: undefined,
          id: undefined,
          status: undefined,
          tags: undefined,
        },
      });

      // Same id / slug would collide if file exists
      await expect(
        // @ts-expect-error citty internal
        newCommand.subCommands.adr.run({
          args: {
            title: "Collision",
            config: undefined,
            id: "ADR-0001",
            status: undefined,
            tags: undefined,
          },
        }),
      ).rejects.toThrow();

      process.cwd = origCwd;
    } finally {
      await fixture.cleanup();
    }
  });

  it("creates SPEC with spec kind", async () => {
    const fixture = await createFixture();
    try {
      const origCwd = process.cwd;
      process.cwd = () => fixture.root;

      const { newCommand } = await import("../commands/new.js");
      // @ts-expect-error citty internal
      await newCommand.subCommands.spec.run({
        args: {
          title: "Auth System",
          config: undefined,
          id: undefined,
          status: undefined,
          tags: undefined,
        },
      });

      const files = await import("node:fs/promises").then((m) =>
        m.readdir(fixture.config.resolvedDocs.specDir),
      );
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/^SPEC-0001-auth-system\.md$/);

      const content = await readFile(
        join(fixture.config.resolvedDocs.specDir, files[0] ?? ""),
        "utf8",
      );
      expect(content).toContain("id: SPEC-0001");
      expect(content).toContain("kind: spec");
      expect(content).toContain("status: draft");

      process.cwd = origCwd;
    } finally {
      await fixture.cleanup();
    }
  });
});
