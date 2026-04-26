import { describe, expect, it } from "vitest";
import { actaRendererPackage } from "./index.js";

describe("@acta/renderer", () => {
  it("exports the package marker", () => {
    expect(actaRendererPackage).toBe("@acta/renderer");
  });
});
