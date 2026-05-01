import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveConfig } from "@acta/core";
import type { ResolvedActaConfig } from "@acta/core";

export interface Fixture {
  root: string;
  config: ResolvedActaConfig;
  writeAdr(name: string, content: string): Promise<void>;
  writeSpec(name: string, content: string): Promise<void>;
  writeFile(relativePath: string, content: string): Promise<void>;
  cleanup(): Promise<void>;
}

export async function createFixture(
  overrides: Parameters<typeof resolveConfig>[0] = {},
): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), "acta-cli-test-"));
  const config = resolveConfig(
    {
      docs: {
        adrDir: "docs/decisions",
        specDir: "docs/specs",
        templatesDir: "docs/templates",
      },
      validation: {
        orphanDocuments: "off",
      },
      ...overrides,
    },
    { rootDir: root },
  );

  // Create directories
  await mkdir(config.resolvedDocs.adrDir, { recursive: true });
  await mkdir(config.resolvedDocs.specDir, { recursive: true });
  await mkdir(config.resolvedDocs.templatesDir, { recursive: true });

  // Copy bundled templates
  const ADR_TPL = `---
id: ADR-0000
kind: adr
title: Template ADR
status: proposed
date: YYYY-MM-DD
tags: []
component: []
owners: []
summary: Short summary.
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

Context.

# Decision

Decision.

# Consequences

Consequences.

# Alternatives

Alternatives.
`;
  const SPEC_TPL = `---
id: SPEC-0000
kind: spec
title: Template Spec
status: draft
date: YYYY-MM-DD
tags: []
component: []
owners: []
summary: Short summary.
links:
  related: []
  decidedBy: []
  dependsOn: []
  validates: []
  references: []
---

# Summary

Summary.

# Goals

Goals.

# Requirements

Requirements.
`;
  await writeFile(join(config.resolvedDocs.templatesDir, "adr.md"), ADR_TPL, "utf8");
  await writeFile(join(config.resolvedDocs.templatesDir, "spec.md"), SPEC_TPL, "utf8");

  return {
    root,
    config,
    writeAdr: (name, content) =>
      writeFile(join(config.resolvedDocs.adrDir, name), content, "utf8"),
    writeSpec: (name, content) =>
      writeFile(join(config.resolvedDocs.specDir, name), content, "utf8"),
    writeFile: (relativePath, content) =>
      writeFile(join(root, relativePath), content, "utf8"),
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

// ---------------------------------------------------------------------------
// Document content factories
// ---------------------------------------------------------------------------

export function adrContent(
  opts: {
    id?: string;
    title?: string;
    status?: string;
    links?: string;
    body?: string;
  } = {},
): string {
  return `---
id: ${opts.id ?? "ADR-0001"}
kind: adr
title: ${opts.title ?? "Test ADR"}
status: ${opts.status ?? "accepted"}
date: 2026-04-26
tags: [core]
component: [acta-core]
owners: [Boris]
summary: Test ADR summary.
links:
  ${opts.links ?? "related: []"}
---

${opts.body ?? `# Context

Context here.

# Decision

Decision here.

# Consequences

Consequences here.

# Alternatives

Alternatives here.`}
`;
}

export function specContent(
  opts: {
    id?: string;
    title?: string;
    status?: string;
    links?: string;
    body?: string;
  } = {},
): string {
  return `---
id: ${opts.id ?? "SPEC-0001"}
kind: spec
title: ${opts.title ?? "Test Spec"}
status: ${opts.status ?? "active"}
date: 2026-04-26
tags: [core]
component: [acta-core]
owners: [Boris]
summary: Test spec summary.
links:
  ${opts.links ?? "related: []"}
---

${opts.body ?? `# Summary

Summary here.

# Goals

Goals here.

# Requirements

Requirements here.`}
`;
}
