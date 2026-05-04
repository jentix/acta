import { buildArtifacts } from "@acta/core";
import { defineCommand } from "citty";
import kleur from "kleur";
import { resolveContext } from "../context.js";
import { printLine, printSuccess, printWarn } from "../output.js";

export const buildCommand = defineCommand({
  meta: {
    name: "build",
    description:
      "Build artifacts: documents.json, graph.json, search-index.json, validation.json, manifest.json",
  },
  args: {
    config: {
      type: "string",
      alias: "c",
      description: "Path to acta.config.ts",
    },
  },
  async run({ args }) {
    const { config } = await resolveContext({ config: args.config });

    printLine("Building artifacts...");

    const result = await buildArtifacts({ config });
    const { manifest, validation } = result;

    printLine();
    printSuccess(`Build complete`);
    printLine(`  ${kleur.bold("Documents:")}  ${manifest.documentCount}`);
    printLine(
      `  ${kleur.bold("Errors:")}     ${manifest.errorCount === 0 ? kleur.green("0") : kleur.red(String(manifest.errorCount))}`,
    );
    printLine(
      `  ${kleur.bold("Warnings:")}   ${manifest.warningCount === 0 ? kleur.dim("0") : kleur.yellow(String(manifest.warningCount))}`,
    );
    printLine(`  ${kleur.bold("Output:")}     ${config.resolvedBuild.outDir}`);
    printLine(`  ${kleur.bold("Built at:")}   ${manifest.builtAt}`);

    if (validation.errorCount > 0) {
      printLine();
      printWarn(
        `Build completed with ${validation.errorCount} validation error${validation.errorCount !== 1 ? "s" : ""}. Run \`acta validate\` for details.`,
      );
      process.exit(1);
    }
  },
});
