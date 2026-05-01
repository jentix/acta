import { defineCommand } from "citty";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { resolveConfig } from "@acta/core";
import { printLine, printSuccess, printWarn } from "../output.js";

// Built-in bundled templates (inline defaults) used when no existing template found
const ADR_TEMPLATE = `---
id: ADR-0000
kind: adr
title: Template ADR
status: proposed
date: YYYY-MM-DD
tags: []
component: []
owners: []
summary: Short summary of the architectural decision.
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

Describe the forces, constraints, and problem that make this decision necessary.

# Decision

State the decision clearly.

# Consequences

Describe expected tradeoffs, follow-up work, and operational impact.

# Alternatives

List the meaningful options considered and why they were not chosen.
`;

const SPEC_TEMPLATE = `---
id: SPEC-0000
kind: spec
title: Template Spec
status: draft
date: YYYY-MM-DD
tags: []
component: []
owners: []
summary: Short summary of the technical specification.
links:
  related: []
  decidedBy: []
  dependsOn: []
  validates: []
  references: []
---

# Summary

Describe the feature, system, or technical change.

# Goals

List the outcomes this spec must achieve.

# Requirements

Define functional and non-functional requirements.

# Proposed design

Describe the planned design.

# Open questions

Track unresolved decisions.
`;

const CONFIG_TEMPLATE = `import { defineConfig } from "@acta/core";

export default defineConfig({
  docs: {
    adrDir: "docs/decisions",
    specDir: "docs/specs",
    templatesDir: "docs/templates",
  },
  ids: {
    adrPrefix: "ADR",
    specPrefix: "SPEC",
    width: 4,
  },
  validation: {
    draftMaxAgeDays: 30,
    requiredSections: {
      adr: ["Context", "Decision", "Consequences"],
      spec: ["Summary", "Goals", "Requirements"],
    },
    orphanDocuments: "warning",
    asymmetricSupersedes: "error",
  },
  build: {
    outDir: ".acta/dist",
    cacheDir: ".acta/cache",
  },
});
`;

async function confirm(message: string): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${message} [y/N] `, (answer) => {
      rl.close();
      resolvePromise(answer.trim().toLowerCase() === "y");
    });
  });
}

async function safeWriteFile(
  filePath: string,
  content: string,
  yes: boolean,
): Promise<boolean> {
  if (existsSync(filePath)) {
    if (!yes) {
      const ok = await confirm(`  Overwrite ${filePath}?`);
      if (!ok) {
        printWarn(`Skipped ${filePath}`);
        return false;
      }
    } else {
      printWarn(`Overwriting ${filePath}`);
    }
  }
  await writeFile(filePath, content, "utf8");
  return true;
}

export const initCommand = defineCommand({
  meta: {
    name: "init",
    description: "Initialize Acta docs structure in the current repository",
  },
  args: {
    yes: {
      type: "boolean",
      alias: "y",
      description: "Skip prompts and overwrite existing files",
      default: false,
    },
    hooks: {
      type: "boolean",
      description: "Install lefthook pre-commit hook template (placeholder)",
      default: false,
    },
    "github-action": {
      type: "boolean",
      description: "Install GitHub Actions workflow template (placeholder)",
      default: false,
    },
    config: {
      type: "string",
      alias: "c",
      description: "Path to acta.config.ts (default: acta.config.ts)",
    },
  },
  async run({ args }) {
    const cwd = resolve(process.cwd());
    const yes = args.yes;

    // Resolve config to get dir paths
    const config = resolveConfig({}, { rootDir: cwd });

    printLine("Initializing Acta docs structure...");
    printLine();

    // 1. Create acta.config.ts
    const configPath = join(cwd, "acta.config.ts");
    const configWritten = await safeWriteFile(configPath, CONFIG_TEMPLATE, yes);
    if (configWritten) printSuccess(`Created ${configPath}`);

    // 2. Create doc directories
    const dirs = [
      config.resolvedDocs.adrDir,
      config.resolvedDocs.specDir,
      config.resolvedDocs.templatesDir,
    ];
    for (const dir of dirs) {
      await mkdir(dir, { recursive: true });
      printSuccess(`Created dir ${dir}`);
    }

    // 3. Write templates (only if not already present from project)
    const adrTplPath = join(config.resolvedDocs.templatesDir, "adr.md");
    const specTplPath = join(config.resolvedDocs.templatesDir, "spec.md");

    const adrWritten = await safeWriteFile(adrTplPath, ADR_TEMPLATE, yes);
    if (adrWritten) printSuccess(`Created ${adrTplPath}`);

    const specWritten = await safeWriteFile(specTplPath, SPEC_TEMPLATE, yes);
    if (specWritten) printSuccess(`Created ${specTplPath}`);

    // 4. Add .acta/ to .gitignore if present
    const gitignorePath = join(cwd, ".gitignore");
    if (existsSync(gitignorePath)) {
      const { readFile, appendFile } = await import("node:fs/promises");
      const content = await readFile(gitignorePath, "utf8");
      if (!content.includes(".acta/")) {
        await appendFile(gitignorePath, "\n# Acta build artifacts\n.acta/\n");
        printSuccess(`Added .acta/ to .gitignore`);
      }
    }

    // 5. Placeholder notices for hooks / github-action
    if (args.hooks) {
      printWarn("--hooks: lefthook template not yet implemented (Phase 4)");
    }
    if (args["github-action"]) {
      printWarn("--github-action: GH Actions template not yet implemented (Phase 4)");
    }

    printLine();
    printSuccess("Acta initialized. Run `acta validate` to check your documents.");
  },
});
