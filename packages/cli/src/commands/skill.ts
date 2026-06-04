import { resolve } from "node:path";
import { defineCommand } from "citty";
import { exitUsage, printSuccess } from "../output.js";
import { installAgentSkill, type SkillFormat, skillFormats } from "../skill.js";

function parseSkillFormat(value: string | undefined): SkillFormat {
  const format = value ?? "both";
  if (!skillFormats.includes(format as SkillFormat)) {
    exitUsage(`Unknown skill format "${format}". Use: codex, claude, both`);
  }
  return format as SkillFormat;
}

export const skillCommand = defineCommand({
  meta: {
    name: "skill",
    description: "Install or refresh the bundled acta-document agent skill",
  },
  args: {
    init: {
      type: "boolean",
      description: "Install or overwrite the bundled acta-document skill",
      default: false,
    },
    format: {
      type: "string",
      description: "Skill target format: codex | claude | both (default: both)",
    },
  },
  async run({ args }) {
    if (!args.init) {
      exitUsage("Usage: acta skill --init [--format codex|claude|both]");
    }

    const cwd = resolve(process.cwd());
    const result = await installAgentSkill(cwd, parseSkillFormat(args.format));

    for (const skillPath of result.skillPaths) {
      printSuccess(`Installed ${skillPath}`);
    }

    if (result.agentsPath) {
      printSuccess(`Updated ${result.agentsPath} with Acta agent guidance`);
    }
  },
});
