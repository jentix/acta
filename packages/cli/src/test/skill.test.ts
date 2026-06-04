import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AGENTS_BLOCK_START, renderSkill } from "../skill.js";

vi.spyOn(process, "exit").mockImplementation((code) => {
  throw new Error(`process.exit(${code})`);
});

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function createRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "acta-skill-test-"));
}

async function runSkill(
  root: string,
  args: {
    init?: boolean;
    format?: string;
  } = {},
): Promise<void> {
  const origCwd = process.cwd;
  process.cwd = () => root;

  try {
    const { skillCommand } = await import("../commands/skill.js");
    const run = skillCommand.run;
    if (!run) throw new Error("skill command run handler is missing");

    await run({
      args: {
        _: [],
        init: args.init ?? true,
        format: args.format,
      },
    } as never);
  } finally {
    process.cwd = origCwd;
  }
}

describe("acta skill --init", () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  it("installs both Codex and Claude skills by default", async () => {
    const root = await createRoot();
    roots.push(root);

    await runSkill(root);

    expect(await readFile(join(root, ".agents/skills/acta-document/SKILL.md"), "utf8")).toBe(
      renderSkill(),
    );
    expect(await readFile(join(root, ".claude/skills/acta-document/SKILL.md"), "utf8")).toBe(
      renderSkill(),
    );
    expect(await readFile(join(root, "AGENTS.md"), "utf8")).toContain(AGENTS_BLOCK_START);
  });

  it("installs only the Codex skill and updates AGENTS.md with --format codex", async () => {
    const root = await createRoot();
    roots.push(root);

    await runSkill(root, { format: "codex" });

    expect(await readFile(join(root, ".agents/skills/acta-document/SKILL.md"), "utf8")).toBe(
      renderSkill(),
    );
    expect(await exists(join(root, ".claude/skills/acta-document/SKILL.md"))).toBe(false);
    expect(await readFile(join(root, "AGENTS.md"), "utf8")).toContain(AGENTS_BLOCK_START);
  });

  it("installs only the Claude skill with --format claude", async () => {
    const root = await createRoot();
    roots.push(root);

    await runSkill(root, { format: "claude" });

    expect(await exists(join(root, ".agents/skills/acta-document/SKILL.md"))).toBe(false);
    expect(await readFile(join(root, ".claude/skills/acta-document/SKILL.md"), "utf8")).toBe(
      renderSkill(),
    );
    expect(await exists(join(root, "AGENTS.md"))).toBe(false);
  });

  it("overwrites stale skill files when re-run", async () => {
    const root = await createRoot();
    roots.push(root);
    const codexSkillPath = join(root, ".agents/skills/acta-document/SKILL.md");
    const claudeSkillPath = join(root, ".claude/skills/acta-document/SKILL.md");
    await mkdir(join(root, ".agents/skills/acta-document"), { recursive: true });
    await mkdir(join(root, ".claude/skills/acta-document"), { recursive: true });
    await writeFile(codexSkillPath, "stale codex skill", "utf8");
    await writeFile(claudeSkillPath, "stale claude skill", "utf8");

    await runSkill(root);

    expect(await readFile(codexSkillPath, "utf8")).toBe(renderSkill());
    expect(await readFile(claudeSkillPath, "utf8")).toBe(renderSkill());
  });

  it("exits with usage error for an invalid format", async () => {
    const root = await createRoot();
    roots.push(root);

    await expect(runSkill(root, { format: "cursor" })).rejects.toThrow("process.exit(2)");
  });

  it("does not scaffold a project", async () => {
    const root = await createRoot();
    roots.push(root);

    await runSkill(root);

    expect(await exists(join(root, "acta.config.ts"))).toBe(false);
    expect(await exists(join(root, "docs"))).toBe(false);
    expect(await exists(join(root, "lefthook.yml"))).toBe(false);
    expect(await exists(join(root, ".github/workflows/acta-ci.yml"))).toBe(false);
  });
});
