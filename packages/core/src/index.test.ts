import { describe, expect, it } from "vitest";
import { actaCorePackage } from "./index.js";

describe("@acta/core", () => {
  it("exports the package marker", () => {
    expect(actaCorePackage).toBe("@acta/core");
  });
});
