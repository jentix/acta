import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createFixture, adrContent, specContent } from "./fixture.js";

const _exitMock = vi.spyOn(process, "exit").mockImplementation((code) => {
  throw new Error(`process.exit(${code})`);
});

describe("acta validate", () => {
  let origCwd: () => string;

  beforeEach(() => {
    origCwd = process.cwd;
  });

  afterEach(() => {
    process.cwd = origCwd;
  });

  it("exits 0 when all documents are valid", async () => {
    const fixture = await createFixture();
    try {
      await fixture.writeAdr("ADR-0001-valid.md", adrContent({ links: "related: [SPEC-0001]" }));
      await fixture.writeSpec("SPEC-0001-valid.md", specContent({ links: "related: [ADR-0001]" }));

      process.cwd = () => fixture.root;

      const { validateCommand } = await import("../commands/validate.js");

      await expect(
        // @ts-expect-error citty internal
        validateCommand.run({ args: { ci: false, json: false, config: undefined } }),
      ).rejects.toThrow("process.exit(0)");
    } finally {
      await fixture.cleanup();
    }
  });

  it("exits 1 when validation errors exist", async () => {
    const fixture = await createFixture();
    try {
      // Broken link to nonexistent SPEC-9999
      await fixture.writeAdr("ADR-0001-broken.md", adrContent({ links: "related: [SPEC-9999]" }));

      process.cwd = () => fixture.root;

      const { validateCommand } = await import("../commands/validate.js");

      await expect(
        // @ts-expect-error citty internal
        validateCommand.run({ args: { ci: false, json: false, config: undefined } }),
      ).rejects.toThrow("process.exit(1)");
    } finally {
      await fixture.cleanup();
    }
  });

  it("--json outputs machine-readable result", async () => {
    const fixture = await createFixture();
    try {
      await fixture.writeAdr("ADR-0001-valid.md", adrContent());

      process.cwd = () => fixture.root;

      const output: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
        output.push(String(chunk));
        return true;
      });

      const { validateCommand } = await import("../commands/validate.js");

      await expect(
        // @ts-expect-error citty internal
        validateCommand.run({ args: { ci: false, json: true, config: undefined } }),
      ).rejects.toThrow();

      const parsed = JSON.parse(output.join("")) as { valid: boolean; errorCount: number };
      expect(typeof parsed.valid).toBe("boolean");
      expect(typeof parsed.errorCount).toBe("number");

      vi.restoreAllMocks();
    } finally {
      await fixture.cleanup();
    }
  });
});
