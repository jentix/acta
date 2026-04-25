import { existsSync, mkdtempSync, mkdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildArtifacts, createNewDocument, graphAsMermaid, initWorkspace, loadIndex } from "../src/lib.js";
describe("cli helpers", () => {
    it("initializes workspace and creates sequential documents", () => {
        const cwd = mkdtempSync(path.join(os.tmpdir(), "adr-book-cli-"));
        mkdirSync(path.join(cwd, "apps/web/public"), { recursive: true });
        initWorkspace(cwd);
        const adrPath = createNewDocument(cwd, "adr", "Second ADR", "Boris");
        const specPath = createNewDocument(cwd, "spec", "Second Spec", "Boris");
        expect(adrPath).toContain("adr-0002-second-adr.md");
        expect(specPath).toContain("spec-0002-second-spec.md");
    });
    it("builds json artifacts and mermaid graph", async () => {
        const cwd = mkdtempSync(path.join(os.tmpdir(), "adr-book-cli-"));
        mkdirSync(path.join(cwd, "apps/web/public"), { recursive: true });
        initWorkspace(cwd);
        const outputs = await buildArtifacts(cwd);
        expect(outputs.some((filePath) => filePath.endsWith("documents.json"))).toBe(true);
        expect(existsSync(path.join(cwd, "apps/web/public/data/graph.json"))).toBe(true);
        const graph = graphAsMermaid(loadIndex(cwd));
        expect(graph).toContain("graph LR");
        const documents = JSON.parse(readFileSync(path.join(cwd, "dist/data/documents.json"), "utf8"));
        expect(documents[0]?.html).toContain("<h1>");
    });
});
//# sourceMappingURL=cli.test.js.map