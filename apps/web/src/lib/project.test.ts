import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findActaRoot, getActaConfigPath } from "./project.js";

describe("web project utilities", () => {
  it("finds the nearest parent directory containing acta.config.ts", async () => {
    const root = join(tmpdir(), `acta-web-${crypto.randomUUID()}`);
    const nested = join(root, "apps", "web", "src");
    await mkdir(nested, { recursive: true });
    await writeFile(join(root, "acta.config.ts"), "export default {};\n", "utf8");

    await expect(findActaRoot(nested)).resolves.toBe(root);
    await expect(getActaConfigPath(nested)).resolves.toBe(join(root, "acta.config.ts"));
  });

  it("throws a clear error when no Acta config exists in parent directories", async () => {
    const root = join(tmpdir(), `acta-web-${crypto.randomUUID()}`);
    await mkdir(root, { recursive: true });

    await expect(findActaRoot(root)).rejects.toThrow("Could not find acta.config.ts");
  });
});
