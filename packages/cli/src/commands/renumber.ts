import { defineCommand } from "citty";
import { loadProject, internalLinkKeys } from "@acta/core";
import type { ActaDocument } from "@acta/core";
import { readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import kleur from "kleur";
import { resolveContext } from "../context.js";
import { exitFailure, exitUsage, printLine, printSuccess, printWarn } from "../output.js";

interface RenumberPlan {
  /** Document being renamed */
  target: ActaDocument;
  oldPath: string;
  newPath: string;
  newFilename: string;
  /** Other documents that reference the old ID in their links */
  affectedDocs: Array<{ doc: ActaDocument; path: string }>;
}

function buildRenumberPlan(
  fromId: string,
  toId: string,
  project: Awaited<ReturnType<typeof loadProject>>,
): RenumberPlan {
  const target = project.documents.find(
    (d) => d.id.toLowerCase() === fromId.toLowerCase(),
  );

  if (!target) {
    exitFailure(`Document "${fromId}" not found.`);
  }

  const collision = project.documents.find(
    (d) => d.id.toLowerCase() === toId.toLowerCase(),
  );
  if (collision) {
    exitFailure(`Target ID "${toId}" already exists at ${collision.file.path}.`);
  }

  // Validate same kind/prefix
  const fromPrefix = fromId.replace(/-\d+$/, "");
  const toPrefix = toId.replace(/-\d+$/, "");
  if (fromPrefix !== toPrefix) {
    exitUsage(
      `Cannot renumber across kinds. FROM prefix "${fromPrefix}" ≠ TO prefix "${toPrefix}".`,
    );
  }

  // Derive new filename: replace FROM-id prefix in current filename
  const oldFilename = basename(target.file.path);
  const oldSlug = oldFilename.replace(`${target.id}-`, "").replace(/\.md$/, "");
  const newFilename = `${toId}-${oldSlug}.md`;
  const newPath = join(dirname(target.file.path), newFilename);

  // Find all docs that reference fromId in internal links
  const affectedDocs = project.documents
    .filter((d) => d.id !== target.id)
    .filter((d) =>
      internalLinkKeys.some((key) => d.links[key].includes(target.id)),
    )
    .map((d) => ({ doc: d, path: d.file.path }));

  return {
    target,
    oldPath: target.file.path,
    newPath,
    newFilename,
    affectedDocs,
  };
}

/**
 * Rewrite raw frontmatter YAML: update id field and any internal link arrays
 * that contain oldId, replacing with newId.
 */
async function rewriteDocument(
  filePath: string,
  oldId: string,
  newId: string,
  isTarget: boolean,
): Promise<string> {
  const raw = await readFile(filePath, "utf8");

  // Split frontmatter and body
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`Cannot parse frontmatter in ${filePath}`);
  }

  const [, frontmatterYaml, body] = match as [string, string, string];

  // Parse → mutate → stringify
  const fm = parseYaml(frontmatterYaml) as Record<string, unknown>;

  if (isTarget) {
    fm.id = newId;
  }

  // Update link arrays
  const linksObj = fm.links as Record<string, unknown> | undefined;
  if (linksObj && typeof linksObj === "object") {
    for (const key of internalLinkKeys) {
      const arr = linksObj[key];
      if (Array.isArray(arr)) {
        linksObj[key] = arr.map((v: unknown) => (v === oldId ? newId : v));
      }
    }
  }

  const newFrontmatter = stringifyYaml(fm, { lineWidth: 0 }).trimEnd();
  return `---\n${newFrontmatter}\n---\n${body}`;
}

export const renumberCommand = defineCommand({
  meta: {
    name: "renumber",
    description: "Rename a document ID, updating frontmatter, filename and all internal links",
  },
  args: {
    from: {
      type: "positional",
      description: "Current document ID (e.g. ADR-0001)",
      required: true,
    },
    to: {
      type: "positional",
      description: "New document ID (e.g. ADR-0007)",
      required: true,
    },
    "dry-run": {
      type: "boolean",
      description: "Print what would change without writing",
      default: false,
    },
    config: {
      type: "string",
      alias: "c",
      description: "Path to acta.config.ts",
    },
  },
  async run({ args }) {
    const fromId = args.from;
    const toId = args.to;
    const dryRun = args["dry-run"];

    if (!fromId || !toId) {
      exitUsage("Usage: acta renumber <FROM> <TO>");
    }

    const { config } = await resolveContext({ config: args.config });
    const project = await loadProject({ config });
    const plan = buildRenumberPlan(fromId, toId, project);

    // Print plan
    printLine();
    printLine(kleur.bold("Renumber plan:"));
    printLine(`  ${kleur.dim("rename")}  ${plan.target.id} → ${kleur.bold(toId)}`);
    printLine(`  ${kleur.dim("file")}    ${basename(plan.oldPath)} → ${kleur.bold(plan.newFilename)}`);

    if (plan.affectedDocs.length > 0) {
      printLine(`  ${kleur.dim("update links in:")}`);
      for (const { doc } of plan.affectedDocs) {
        printLine(`    ${doc.id}  ${doc.file.relativePath}`);
      }
    } else {
      printLine(`  ${kleur.dim("no other documents reference this ID")}`);
    }

    if (dryRun) {
      printLine();
      printWarn("Dry run — no changes written.");
      return;
    }

    printLine();

    // Rewrite affected docs (not target)
    for (const { doc, path } of plan.affectedDocs) {
      const rewritten = await rewriteDocument(path, fromId, toId, false);
      await writeFile(path, rewritten, "utf8");
      printSuccess(`Updated links in ${doc.id}`);
    }

    // Rewrite target frontmatter (still at old path)
    const rewrittenTarget = await rewriteDocument(plan.oldPath, fromId, toId, true);
    await writeFile(plan.oldPath, rewrittenTarget, "utf8");

    // Rename file
    await rename(plan.oldPath, plan.newPath);
    printSuccess(`Renamed ${basename(plan.oldPath)} → ${plan.newFilename}`);

    printLine();
    printSuccess(`Renumber complete: ${fromId} → ${toId}`);

    // Post-write validation
    const { validateLoadedProject } = await import("@acta/core");
    const result = await validateLoadedProject({ config });
    if (!result.valid) {
      printLine();
      printWarn(
        `Renumber introduced ${result.errorCount} validation error${result.errorCount !== 1 ? "s" : ""}. Run \`acta validate\` for details.`,
      );
      process.exit(1);
    }
  },
});
