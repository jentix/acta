#!/usr/bin/env node
import { defineCommand, runMain } from "citty";
import { buildCommand } from "./commands/build.js";
import { graphCommand } from "./commands/graph.js";
import { initCommand } from "./commands/init.js";
import { listCommand } from "./commands/list.js";
import { newCommand } from "./commands/new.js";
import { renumberCommand } from "./commands/renumber.js";
import { showCommand } from "./commands/show.js";
import { validateCommand } from "./commands/validate.js";

const main = defineCommand({
  meta: {
    name: "acta",
    version: "0.0.0",
    description: "TypeScript-first docs-as-code tool for ADR and spec documents",
  },
  subCommands: {
    init: initCommand,
    new: newCommand,
    list: listCommand,
    show: showCommand,
    validate: validateCommand,
    graph: graphCommand,
    build: buildCommand,
    renumber: renumberCommand,
  },
});

export const actaCliPackage = "@acta/cli";

export function getCliBootstrapInfo() {
  return {
    name: "acta",
    packageName: actaCliPackage,
    version: "0.0.0",
  };
}

// Only run when executed directly (not when imported in tests)
import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await runMain(main);
}
