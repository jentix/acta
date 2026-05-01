import { defineCommand } from "citty";
import { loadProject } from "@acta/core";
import type { ActaDocument } from "@acta/core";
import kleur from "kleur";
import { resolveContext } from "../context.js";
import { printJson, printLine, printTable } from "../output.js";

const STATUS_COLORS: Record<string, (s: string) => string> = {
  // ADR
  proposed: (s) => kleur.cyan(s),
  accepted: (s) => kleur.green(s),
  rejected: (s) => kleur.red(s),
  deprecated: (s) => kleur.yellow(s),
  superseded: (s) => kleur.dim(s),
  // Spec
  draft: (s) => kleur.cyan(s),
  active: (s) => kleur.green(s),
  paused: (s) => kleur.yellow(s),
  implemented: (s) => kleur.green(s),
  obsolete: (s) => kleur.dim(s),
};

function colorStatus(status: string): string {
  return (STATUS_COLORS[status] ?? ((s: string) => s))(status);
}

export const listCommand = defineCommand({
  meta: {
    name: "list",
    description: "List documents in the repository",
  },
  args: {
    kind: {
      type: "string",
      alias: "k",
      description: "Filter by kind: adr | spec",
    },
    status: {
      type: "string",
      alias: "s",
      description: "Filter by status",
    },
    tag: {
      type: "string",
      alias: "t",
      description: "Filter by tag",
    },
    json: {
      type: "boolean",
      description: "Output as JSON",
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
    const project = await loadProject({ config });

    let docs: ActaDocument[] = project.documents;

    if (args.kind) {
      if (args.kind !== "adr" && args.kind !== "spec") {
        process.stderr.write(`error: unknown kind "${args.kind}". Use: adr, spec\n`);
        process.exit(2);
      }
      docs = docs.filter((d) => d.kind === args.kind);
    }

    if (args.status) {
      docs = docs.filter((d) => d.status === args.status);
    }

    if (args.tag) {
      const tag = args.tag;
      docs = docs.filter((d) => d.tags.includes(tag));
    }

    // Sort: kind asc, then id asc
    docs = docs.slice().sort((a, b) => {
      if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
      return a.id.localeCompare(b.id);
    });

    if (args.json) {
      printJson(
        docs.map((d) => ({
          id: d.id,
          kind: d.kind,
          title: d.title,
          status: d.status,
          date: d.date,
          tags: d.tags,
          component: d.component,
          owners: d.owners,
          summary: d.summary,
        })),
      );
      return;
    }

    if (docs.length === 0) {
      printLine("No documents found.");
      return;
    }

    const rows = [
      [
        kleur.bold("ID"),
        kleur.bold("KIND"),
        kleur.bold("STATUS"),
        kleur.bold("TITLE"),
      ],
      ...docs.map((d) => [
        kleur.bold(d.id),
        d.kind,
        colorStatus(d.status),
        d.title,
      ]),
    ];

    printTable(rows);
    printLine();
    printLine(kleur.dim(`${docs.length} document${docs.length !== 1 ? "s" : ""}`));
  },
});
