import { describe, expect, it } from "vitest";
import { actaWebPackage } from "./index.js";

describe("@acta/web", () => {
  it("marks the future static viewer package", () => {
    expect(actaWebPackage).toBe("@acta/web");
  });
});
