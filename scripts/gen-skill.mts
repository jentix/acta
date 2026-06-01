#!/usr/bin/env tsx
// Regenerates the committed agent-skill copies from the single source of truth
// in packages/cli/src/skill.ts. Run via `pnpm gen:skill`. The committed files
// are guarded by packages/cli/src/skill-contract.test.ts — never hand-edit them.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSkill } from "../packages/cli/src/skill.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const targets = [
  join(repoRoot, "skills", "acta-document", "SKILL.md"),
  join(repoRoot, "plugins", "acta", "skills", "acta-document", "SKILL.md"),
];

const content = renderSkill();

for (const target of targets) {
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
  console.log(`wrote ${target}`);
}
