import { describe, expect, it } from "vitest";
import { titleToSlug } from "../slug.js";

describe("titleToSlug", () => {
  it("lowercases and replaces spaces with dashes", () => {
    expect(titleToSlug("Use Markdown As Source")).toBe("use-markdown-as-source");
  });

  it("removes special characters", () => {
    expect(titleToSlug("CLI: Commands & Flags!")).toBe("cli-commands-flags");
  });

  it("collapses multiple dashes", () => {
    expect(titleToSlug("foo   bar")).toBe("foo-bar");
  });

  it("trims leading/trailing dashes", () => {
    expect(titleToSlug("  hello world  ")).toBe("hello-world");
  });

  it("handles empty string", () => {
    expect(titleToSlug("")).toBe("");
  });

  it("handles already-slug input", () => {
    expect(titleToSlug("use-typescript-monorepo")).toBe("use-typescript-monorepo");
  });
});
