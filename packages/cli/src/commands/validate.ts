import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { validateLoadedProject } from "@acta/core";
import { defineCommand } from "citty";
import kleur from "kleur";
import { resolveContext } from "../context.js";
import { printIssues, printJson, printLine, printValidationSummary } from "../output.js";

export const validateCommand = defineCommand({
  meta: {
    name: "validate",
    description: "Validate documents for schema errors, broken links and rule violations",
  },
  args: {
    ci: {
      type: "boolean",
      description: "Write validation.json to outDir and use concise output",
      default: false,
    },
    json: {
      type: "boolean",
      description: "Print machine-readable result to stdout",
      default: false,
    },
    config: {
      type: "string",
      alias: "c",
      description: "Path to acta.config.ts",
    },
  },
  async run({ args }) {
    const { config } = await resolveContext({ config: args.config });
    const result = await validateLoadedProject({ config });

    if (args.json) {
      printJson(result);
      process.exit(result.valid ? 0 : 1);
      return;
    }

    if (args.ci) {
      // Write validation.json
      await mkdir(config.resolvedBuild.outDir, { recursive: true });
      const outPath = join(config.resolvedBuild.outDir, "validation.json");
      await writeFile(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

      // Concise output
      if (result.errors.length > 0) {
        for (const issue of result.errors) {
          printLine(`${kleur.red("error")}  ${issue.documentId ?? ""}  ${issue.message}`);
        }
      }
      for (const issue of result.warnings) {
        printLine(`${kleur.yellow("warn")}   ${issue.documentId ?? ""}  ${issue.message}`);
      }
      printLine(`Written ${outPath}`);
      process.exit(result.valid ? 0 : 1);
      return;
    }

    // Default human-readable
    if (result.issues.length === 0) {
      printValidationSummary(0, 0, true);
    } else {
      const errors = result.issues.filter((i) => i.severity === "error");
      const warnings = result.issues.filter((i) => i.severity === "warning");

      if (errors.length > 0) {
        printLine();
        printLine(kleur.bold("Errors:"));
        printIssues(errors);
      }
      if (warnings.length > 0) {
        printLine();
        printLine(kleur.bold("Warnings:"));
        printIssues(warnings);
      }
      printLine();
      printValidationSummary(result.errorCount, result.warningCount, result.valid);
    }

    process.exit(result.valid ? 0 : 1);
  },
});
