import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildRepositoryIndex, loadConfig } from "../src/index.js";
function makeRepo() {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "adr-book-core-"));
    mkdirSync(path.join(cwd, "docs/decisions"), { recursive: true });
    mkdirSync(path.join(cwd, "docs/specs"), { recursive: true });
    writeFileSync(path.join(cwd, "adr-book.config.json"), JSON.stringify({
        title: "Test ADR Book",
        decisionsDir: "docs/decisions",
        specsDir: "docs/specs",
        templatesDir: "docs/templates",
        outputDir: "dist"
    }, null, 2));
    return cwd;
}
describe("core repository index", () => {
    it("parses valid adr and spec and builds backlinks", () => {
        const cwd = makeRepo();
        writeFileSync(path.join(cwd, "docs/decisions/adr-0001-markdown.md"), `---
id: ADR-0001
kind: adr
title: Use Markdown
status: accepted
date: 2026-04-17
tags: [docs]
component: [core]
owners: [Boris]
links:
  related: []
  supersedes: []
  replacedBy: []
  decidedBy: []
  dependsOn: []
  validates: []
  references: []
---

# Context

Context

# Decision

Decision

# Consequences

Consequences
`);
        writeFileSync(path.join(cwd, "docs/specs/spec-0001-model.md"), `---
id: SPEC-0001
kind: spec
title: Document model
status: active
date: 2026-04-17
tags: [model]
component: [core]
owners: [Boris]
links:
  related: []
  supersedes: []
  replacedBy: []
  decidedBy: [ADR-0001]
  dependsOn: []
  validates: []
  references: []
---

# Summary

Summary

# Goals

Goals

# Requirements

Requirements

# Proposed design

Design
`);
        const index = buildRepositoryIndex(cwd, loadConfig(cwd));
        expect(index.documents).toHaveLength(2);
        expect(index.issues).toHaveLength(0);
        expect(index.backlinks["ADR-0001"]).toHaveLength(1);
    });
    it("reports duplicate ids, broken refs and missing sections", () => {
        const cwd = makeRepo();
        writeFileSync(path.join(cwd, "docs/decisions/one.md"), `---
id: ADR-0001
kind: adr
title: One
status: accepted
date: 2026-04-17
tags: []
component: []
owners: []
links:
  related: []
  supersedes: []
  replacedBy: []
  decidedBy: []
  dependsOn: [SPEC-4040]
  validates: []
  references: []
---

# Context

Body
`);
        writeFileSync(path.join(cwd, "docs/specs/two.md"), `---
id: ADR-0001
kind: spec
title: Two
status: active
date: 2026-04-17
tags: []
component: []
owners: []
links:
  related: []
  supersedes: []
  replacedBy: []
  decidedBy: []
  dependsOn: []
  validates: []
  references: []
---

# Summary

Summary
`);
        const index = buildRepositoryIndex(cwd, loadConfig(cwd));
        const codes = index.issues.map((issue) => issue.code);
        expect(codes).toContain("duplicate_id");
        expect(codes).toContain("broken_link");
        expect(codes).toContain("missing_section");
    });
    it("detects supersedes cycles and implemented spec warning", () => {
        const cwd = makeRepo();
        writeFileSync(path.join(cwd, "docs/decisions/adr-1.md"), `---
id: ADR-0001
kind: adr
title: One
status: superseded
date: 2026-04-17
tags: []
component: []
owners: []
links:
  related: []
  supersedes: [ADR-0002]
  replacedBy: []
  decidedBy: []
  dependsOn: []
  validates: []
  references: []
---

# Context

A

# Decision

B

# Consequences

C
`);
        writeFileSync(path.join(cwd, "docs/decisions/adr-2.md"), `---
id: ADR-0002
kind: adr
title: Two
status: accepted
date: 2026-04-17
tags: []
component: []
owners: []
links:
  related: []
  supersedes: [ADR-0001]
  replacedBy: []
  decidedBy: []
  dependsOn: []
  validates: []
  references: []
---

# Context

A

# Decision

B

# Consequences

C
`);
        writeFileSync(path.join(cwd, "docs/specs/spec-1.md"), `---
id: SPEC-0001
kind: spec
title: Implemented spec
status: implemented
date: 2026-04-17
tags: []
component: []
owners: []
links:
  related: []
  supersedes: []
  replacedBy: []
  decidedBy: []
  dependsOn: []
  validates: []
  references: []
---

# Summary

Summary

# Goals

Goals

# Requirements

Requirements

# Proposed design

Design
`);
        const index = buildRepositoryIndex(cwd, loadConfig(cwd));
        const codes = index.issues.map((issue) => issue.code);
        expect(codes).toContain("supersedes_cycle");
        expect(codes).toContain("implemented_spec_without_proof");
    });
});
//# sourceMappingURL=core.test.js.map