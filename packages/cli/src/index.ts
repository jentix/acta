#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";

import {
  buildArtifacts,
  createNewDocument,
  formatDocumentDetails,
  formatDocumentTable,
  formatIssues,
  graphAsMermaid,
  initWorkspace,
  loadIndex
} from "./lib.js";

const program = new Command();

program.name("adr-book").description("ADR Book CLI").version("0.1.0");
const newCommand = program.command("new").description("Create a new document");

program
  .command("init")
  .description("Initialize ADR Book folders, config and starter templates")
  .action(() => {
    const cwd = process.cwd();
    const created = initWorkspace(cwd);
    console.log(`Initialized ADR Book in ${cwd}`);
    for (const filePath of created) {
      console.log(`- ${path.relative(cwd, filePath)}`);
    }
  });

newCommand
  .command("adr")
  .requiredOption("--title <title>", "Document title")
  .option("--owner <owner>", "Primary owner")
  .action((options) => {
    const filePath = createNewDocument(process.cwd(), "adr", options.title, options.owner);
    console.log(path.relative(process.cwd(), filePath));
  });

newCommand
  .command("spec")
  .requiredOption("--title <title>", "Document title")
  .option("--owner <owner>", "Primary owner")
  .action((options) => {
    const filePath = createNewDocument(process.cwd(), "spec", options.title, options.owner);
    console.log(path.relative(process.cwd(), filePath));
  });

program
  .command("list")
  .description("List indexed documents")
  .action(() => {
    console.log(formatDocumentTable(loadIndex(process.cwd())));
  });

program
  .command("show")
  .argument("<id>", "Document id")
  .description("Show a document and related metadata")
  .action((id) => {
    console.log(formatDocumentDetails(loadIndex(process.cwd()), id));
  });

program
  .command("validate")
  .description("Validate the repository")
  .action(() => {
    const index = loadIndex(process.cwd());
    console.log(formatIssues(index));
    if (index.issues.some((issue) => issue.level === "error")) {
      process.exitCode = 1;
    }
  });

program
  .command("graph")
  .description("Print document graph")
  .option("--format <format>", "json or mermaid", "json")
  .action((options) => {
    const index = loadIndex(process.cwd());
    if (options.format === "mermaid") {
      console.log(graphAsMermaid(index));
      return;
    }
    console.log(JSON.stringify(index.graph, null, 2));
  });

program
  .command("build")
  .description("Build JSON artifacts for the web viewer")
  .action(async () => {
    const outputs = await buildArtifacts(process.cwd());
    for (const filePath of outputs) {
      console.log(path.relative(process.cwd(), filePath));
    }
  });

program.parseAsync(process.argv);
