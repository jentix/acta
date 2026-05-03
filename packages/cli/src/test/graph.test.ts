import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adrContent, createFixture, specContent } from "./fixture.js";

vi.spyOn(process, "exit").mockImplementation((code) => {
  throw new Error(`process.exit(${code})`);
});

describe("acta graph", () => {
  let origCwd: () => string;

  beforeEach(() => {
    origCwd = process.cwd;
  });

  afterEach(() => {
    process.cwd = origCwd;
    vi.restoreAllMocks();
  });

  it("--format json returns graph with nodes and edges", async () => {
    const fixture = await createFixture();
    try {
      await fixture.writeAdr("ADR-0001-one.md", adrContent({ links: "related: [SPEC-0001]" }));
      await fixture.writeSpec("SPEC-0001-spec.md", specContent());

      process.cwd = () => fixture.root;

      const output: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
        output.push(String(chunk));
        return true;
      });

      const { graphCommand } = await import("../commands/graph.js");
      // @ts-expect-error citty internal
      await graphCommand.run({ args: { format: "json", config: undefined } });

      const parsed = JSON.parse(output.join("")) as { nodes: unknown[]; edges: unknown[] };
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(Array.isArray(parsed.edges)).toBe(true);
      expect(parsed.nodes).toHaveLength(2);
      // related edge: ADR-0001 -> SPEC-0001
      expect(parsed.edges).toHaveLength(1);
    } finally {
      await fixture.cleanup();
    }
  });

  it("--format mermaid outputs mermaid flowchart", async () => {
    const fixture = await createFixture();
    try {
      await fixture.writeAdr("ADR-0001-one.md", adrContent());

      process.cwd = () => fixture.root;

      const output: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
        output.push(String(chunk));
        return true;
      });

      const { graphCommand } = await import("../commands/graph.js");
      // @ts-expect-error citty internal
      await graphCommand.run({ args: { format: "mermaid", config: undefined } });

      const text = output.join("");
      expect(text).toContain("flowchart LR");
      expect(text).toContain("ADR-0001");
    } finally {
      await fixture.cleanup();
    }
  });
});
