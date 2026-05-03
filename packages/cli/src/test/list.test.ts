import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adrContent, createFixture, specContent } from "./fixture.js";

vi.spyOn(process, "exit").mockImplementation((code) => {
  throw new Error(`process.exit(${code})`);
});

describe("acta list", () => {
  let origCwd: () => string;

  beforeEach(() => {
    origCwd = process.cwd;
  });

  afterEach(() => {
    process.cwd = origCwd;
    vi.restoreAllMocks();
  });

  it("lists all documents", async () => {
    const fixture = await createFixture();
    try {
      await fixture.writeAdr("ADR-0001-one.md", adrContent());
      await fixture.writeSpec("SPEC-0001-spec.md", specContent());

      process.cwd = () => fixture.root;

      const output: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
        output.push(String(chunk));
        return true;
      });

      await runListCommand({
        args: {
          _: [],
          kind: undefined,
          k: undefined,
          status: undefined,
          s: undefined,
          tag: undefined,
          t: undefined,
          json: false,
          config: undefined,
          c: undefined,
        },
      } as never);

      const text = output.join("");
      expect(text).toContain("ADR-0001");
      expect(text).toContain("SPEC-0001");
    } finally {
      await fixture.cleanup();
    }
  });

  it("filters by kind", async () => {
    const fixture = await createFixture();
    try {
      await fixture.writeAdr("ADR-0001-one.md", adrContent());
      await fixture.writeSpec("SPEC-0001-spec.md", specContent());

      process.cwd = () => fixture.root;

      const output: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
        output.push(String(chunk));
        return true;
      });

      await runListCommand({
        args: {
          _: [],
          kind: "adr",
          k: undefined,
          status: undefined,
          s: undefined,
          tag: undefined,
          t: undefined,
          json: false,
          config: undefined,
          c: undefined,
        },
      } as never);

      const text = output.join("");
      expect(text).toContain("ADR-0001");
      expect(text).not.toContain("SPEC-0001");
    } finally {
      await fixture.cleanup();
    }
  });

  it("--json returns structured array", async () => {
    const fixture = await createFixture();
    try {
      await fixture.writeAdr("ADR-0001-one.md", adrContent());

      process.cwd = () => fixture.root;

      const output: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
        output.push(String(chunk));
        return true;
      });

      await runListCommand({
        args: {
          _: [],
          kind: undefined,
          k: undefined,
          status: undefined,
          s: undefined,
          tag: undefined,
          t: undefined,
          json: true,
          config: undefined,
          c: undefined,
        },
      } as never);

      const parsed = JSON.parse(output.join("")) as Array<{ id: string; kind: string }>;
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0]?.id).toBe("ADR-0001");
    } finally {
      await fixture.cleanup();
    }
  });
});

async function runListCommand(options: {
  args: Record<string, string | number | boolean | string[]>;
}) {
  const { listCommand } = await import("../commands/list.js");
  const run = listCommand.run;
  if (!run) throw new Error("list command run handler is missing");
  await run(options as never);
}
