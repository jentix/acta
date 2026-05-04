import type { ActaDocument, ResolvedActaConfig } from "@acta/core";
import { resolveConfig } from "@acta/core";
import { describe, expect, it } from "vitest";
import { allocateNextId, parseIdNumber, parseIdPrefix } from "../id.js";

const config: ResolvedActaConfig = resolveConfig({}, { rootDir: "/tmp/fake" });

function fakeDoc(id: string, kind: "adr" | "spec"): ActaDocument {
  return {
    id,
    kind,
    title: id,
    status: kind === "adr" ? "accepted" : "active",
    date: "2026-01-01",
    tags: [],
    component: [],
    owners: [],
    links: {
      related: [],
      supersedes: [],
      replacedBy: [],
      decidedBy: [],
      dependsOn: [],
      validates: [],
      references: [],
    },
    backlinks: {
      related: [],
      supersedes: [],
      replacedBy: [],
      decidedBy: [],
      dependsOn: [],
      validates: [],
      references: [],
    },
    sections: [],
    body: "",
    file: {
      path: `/tmp/${id}.md`,
      relativePath: `docs/${id}.md`,
      slug: id.toLowerCase(),
      contentHash: "abc",
    },
  } as ActaDocument;
}

describe("allocateNextId", () => {
  it("allocates ADR-0001 when no ADRs exist", () => {
    expect(allocateNextId("adr", [], config)).toBe("ADR-0001");
  });

  it("allocates ADR-0002 when ADR-0001 exists", () => {
    const docs = [fakeDoc("ADR-0001", "adr")];
    expect(allocateNextId("adr", docs, config)).toBe("ADR-0002");
  });

  it("skips gaps and allocates max + 1", () => {
    const docs = [fakeDoc("ADR-0001", "adr"), fakeDoc("ADR-0003", "adr")];
    expect(allocateNextId("adr", docs, config)).toBe("ADR-0004");
  });

  it("ignores spec docs when allocating adr", () => {
    const docs = [fakeDoc("SPEC-0005", "spec")];
    expect(allocateNextId("adr", docs, config)).toBe("ADR-0001");
  });

  it("pads to configured width (4)", () => {
    const docs = [fakeDoc("ADR-0009", "adr")];
    expect(allocateNextId("adr", docs, config)).toBe("ADR-0010");
  });

  it("allocates SPEC prefix for spec kind", () => {
    expect(allocateNextId("spec", [], config)).toBe("SPEC-0001");
  });
});

describe("parseIdNumber", () => {
  it("extracts numeric suffix", () => {
    expect(parseIdNumber("ADR-0007")).toBe(7);
  });

  it("returns NaN for non-numeric", () => {
    expect(parseIdNumber("ADR-ABC")).toBeNaN();
  });
});

describe("parseIdPrefix", () => {
  it("strips numeric suffix", () => {
    expect(parseIdPrefix("ADR-0001")).toBe("ADR");
  });

  it("handles multi-part prefix", () => {
    expect(parseIdPrefix("MY-ADR-0001")).toBe("MY-ADR");
  });
});
