import { buildArtifacts } from "@acta-dev/core";
import { defineCommand } from "citty";
import kleur from "kleur";
import { resolveContext } from "../context.js";
import { printJson, printLine, printSuccess, printWarn } from "../output.js";

export const buildCommand = defineCommand({
  meta: {
    name: "build",
    description: "Build normalized JSON artifacts for the web viewer, CI and integrations",
  },
  args: {
    json: {
      type: "boolean",
      description: "Print the build manifest as JSON",
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

    if (!args.json) {
      printLine("Building artifacts...");
    }

    const result = await buildArtifacts({ config });
    const { manifest, validation } = result;

    if (args.json) {
      printJson({ ...manifest, outDir: config.resolvedBuild.outDir });
      process.exit(validation.errorCount > 0 ? 1 : 0);
      return;
    }

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
