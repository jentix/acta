import { defineCommand } from "citty";
import { loadProject } from "@acta/core";
import kleur from "kleur";
import { resolveContext } from "../context.js";
import { exitFailure, exitUsage, printJson, printLine } from "../output.js";

export const showCommand = defineCommand({
  meta: {
    name: "show",
    description: "Show a document by ID",
  },
  args: {
    id: {
      type: "positional",
      description: "Document ID (e.g. ADR-0001)",
      required: true,
    },
    json: {
      type: "boolean",
      description: "Output full document as JSON",
      default: false,
    },
    config: {
      type: "string",
      alias: "c",
      description: "Path to acta.config.ts",
    },
  },
  async run({ args }) {
    if (!args.id) {
      exitUsage("ID is required. Usage: acta show <ID>");
    }

    const { config } = await resolveContext({ config: args.config });
    const project = await loadProject({ config });

    const doc = project.documents.find(
      (d) => d.id.toLowerCase() === args.id.toLowerCase(),
    );

    if (!doc) {
      exitFailure(`Document "${args.id}" not found.`);
    }

    if (args.json) {
      printJson(doc);
      return;
    }

    // Human-readable output
    printLine();
    printLine(`${kleur.bold(doc.id)}  ${kleur.dim(doc.kind)}  ${doc.status}`);
    printLine(kleur.bold(doc.title));
    printLine(kleur.dim(doc.file.relativePath));
    printLine();

    if (doc.summary) {
      printLine(doc.summary);
      printLine();
    }

    // Metadata
    printLine(`${kleur.bold("Date:")}     ${doc.date}${doc.updated ? `  (updated ${doc.updated})` : ""}`);
    if (doc.tags.length > 0) {
      printLine(`${kleur.bold("Tags:")}     ${doc.tags.join(", ")}`);
    }
    if (doc.component.length > 0) {
      printLine(`${kleur.bold("Component:")} ${doc.component.join(", ")}`);
    }
    if (doc.owners.length > 0) {
      printLine(`${kleur.bold("Owners:")}   ${doc.owners.join(", ")}`);
    }

    // Sections
    if (doc.sections.length > 0) {
      printLine();
      printLine(kleur.bold("Sections:"));
      for (const section of doc.sections) {
        printLine(`  ${"#".repeat(section.level)} ${section.title}`);
      }
    }

    // Outgoing links
    const linkEntries = Object.entries(doc.links).filter(
      ([, ids]) => (ids as string[]).length > 0,
    );
    if (linkEntries.length > 0) {
      printLine();
      printLine(kleur.bold("Links:"));
      for (const [key, ids] of linkEntries) {
        printLine(`  ${kleur.cyan(key)}: ${(ids as string[]).join(", ")}`);
      }
    }

    // Backlinks
    const backlinkEntries = Object.entries(doc.backlinks).filter(
      ([, ids]) => (ids as string[]).length > 0,
    );
    if (backlinkEntries.length > 0) {
      printLine();
      printLine(kleur.bold("Backlinks:"));
      for (const [key, ids] of backlinkEntries) {
        printLine(`  ${kleur.cyan(key)}: ${(ids as string[]).join(", ")}`);
      }
    }

    printLine();
  },
});
