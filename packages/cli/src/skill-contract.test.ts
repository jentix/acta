import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adrStatuses, documentKinds, linkKeys, specStatuses } from "@acta-dev/core";
import { describe, expect, test } from "vitest";
import { parse as parseYaml } from "yaml";
import { renderAgentsBlock, renderSkill, SKILL_NAME } from "./skill.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const COMMITTED_COPIES = [
  "skills/acta-document/SKILL.md",
  "plugins/acta/skills/acta-document/SKILL.md",
];

function read(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("skill contract", () => {
  test("committed SKILL.md copies match the renderer byte-for-byte", () => {
    const expected = renderSkill();
    for (const copy of COMMITTED_COPIES) {
      expect(read(copy), `${copy} is stale — run \`pnpm gen:skill\``).toBe(expected);
    }
  });

  test("skill mentions every live document-model value from core", () => {
    const skill = renderSkill();
    for (const value of [...documentKinds, ...adrStatuses, ...specStatuses, ...linkKeys]) {
      expect(skill, `skill is missing "${value}" from core`).toContain(value);
    }
  });

  test("AGENTS.md block mentions every status and link key", () => {
    const block = renderAgentsBlock();
    for (const value of [...adrStatuses, ...specStatuses, ...linkKeys]) {
      expect(block, `AGENTS block is missing "${value}"`).toContain(value);
    }
  });

  test("SKILL.md frontmatter is valid and names the skill", () => {
    const skill = renderSkill();
    const match = skill.match(/^---\n([\s\S]*?)\n---\n/);
    expect(match, "SKILL.md must start with a YAML frontmatter block").not.toBeNull();
    const frontmatter = parseYaml(match?.[1] ?? "") as {
      name?: string;
      description?: string;
      "allowed-tools"?: string;
    };
    expect(frontmatter.name).toBe(SKILL_NAME);
    expect(frontmatter.description).toBeTruthy();
    expect(frontmatter["allowed-tools"]).toBe("Bash");
  });
});
