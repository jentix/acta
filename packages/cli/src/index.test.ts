import { describe, expect, it } from "vitest";
import { getCliBootstrapInfo } from "./index.js";

describe("@acta/cli", () => {
  it("reserves the acta binary name", () => {
    expect(getCliBootstrapInfo().name).toBe("acta");
  });
});
