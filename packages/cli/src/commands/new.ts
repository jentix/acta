import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DocumentKind } from "@acta/core";
import { adrStatuses, specStatuses } from "@acta/core";
import { defineCommand } from "citty";
import { resolveContext } from "../context.js";
import { allocateNextId } from "../id.js";
import { exitFailure, exitUsage, printSuccess } from "../output.js";
import { titleToSlug } from "../slug.js";
import { renderTemplate, todayIso } from "../template.js";

async function createDocument(
  kind: DocumentKind,
  title: string,
  opts: {
    config?: string;
    id?: string;
    status?: string;
    tags?: string;
  },
): Promise<void> {
  if (!title || title.trim() === "") {
    exitUsage(`Title is required. Usage: acta new ${kind} "My title"`);
  }

  const { config } = await resolveContext({ config: opts.config });

  // Dynamic import to avoid circular at top level
  const { loadProject } = await import("@acta/core");
  const project = await loadProject({ config });

  // Allocate or validate ID
  let id: string;
  if (opts.id) {
    // Validate that id matches kind prefix
    const prefix = kind === "adr" ? config.ids.adrPrefix : config.ids.specPrefix;
    if (!opts.id.startsWith(`${prefix}-`)) {
      exitUsage(`ID "${opts.id}" does not match ${kind} prefix "${prefix}-"`);
    }
    // Check for collision
    const existing = project.documents.find((d) => d.id === opts.id);
    if (existing) {
      exitFailure(`Document "${opts.id}" already exists at ${existing.file.path}`);
    }
    id = opts.id;
  } else {
    id = allocateNextId(kind, project.documents, config);
  }

  // Determine default status
  const defaultStatus = kind === "adr" ? "proposed" : "draft";
  const status = opts.status ?? defaultStatus;

  // Validate status
  const validStatuses: readonly string[] = kind === "adr" ? adrStatuses : specStatuses;
  if (!validStatuses.includes(status)) {
    exitUsage(`Invalid status "${status}" for ${kind}. Valid: ${validStatuses.join(", ")}`);
  }

  const slug = titleToSlug(title.trim());
  const filename = `${id}-${slug}.md`;
  const dir = kind === "adr" ? config.resolvedDocs.adrDir : config.resolvedDocs.specDir;
  const destPath = join(dir, filename);

  if (existsSync(destPath)) {
    exitFailure(`File already exists: ${destPath}`);
  }

  const content = await renderTemplate(
    kind,
    { id, title: title.trim(), date: todayIso(), status },
    config,
  );

  await writeFile(destPath, content, "utf8");
  printSuccess(`Created ${destPath}`);
}

export const newCommand = defineCommand({
  meta: {
    name: "new",
    description: "Create a new ADR or spec from template",
  },
  args: {
    config: {
      type: "string",
      alias: "c",
      description: "Path to acta.config.ts",
    },
  },
  subCommands: {
    adr: defineCommand({
      meta: { name: "adr", description: "Create a new ADR" },
      args: {
        title: {
          type: "positional",
          description: "Document title",
          required: true,
        },
        id: {
          type: "string",
          description: "Override auto-allocated ID (e.g. ADR-0007)",
        },
        status: {
          type: "string",
          description: "Initial status (default: proposed)",
        },
        tags: {
          type: "string",
          description: "Comma-separated tags",
        },
        config: {
          type: "string",
          alias: "c",
          description: "Path to acta.config.ts",
        },
      },
      async run({ args }) {
        await createDocument("adr", args.title, args);
      },
    }),
    spec: defineCommand({
      meta: { name: "spec", description: "Create a new spec" },
      args: {
        title: {
          type: "positional",
          description: "Document title",
          required: true,
        },
        id: {
          type: "string",
          description: "Override auto-allocated ID (e.g. SPEC-0005)",
        },
        status: {
          type: "string",
          description: "Initial status (default: draft)",
        },
        tags: {
          type: "string",
          description: "Comma-separated tags",
        },
        config: {
          type: "string",
          alias: "c",
          description: "Path to acta.config.ts",
        },
      },
      async run({ args }) {
        await createDocument("spec", args.title, args);
      },
    }),
  },
});
