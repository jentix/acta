#!/usr/bin/env node
// Post-publish smoke test: installs the PUBLISHED @acta-dev/cli from npm into a
// throwaway project and drives the full adoption flow (init -> new -> validate
// -> build -> site) exactly as an external user would. Catches packaging bugs
// that workspace tests cannot: missing `files`, unpublished deps, broken bins,
// unresolved `@acta-dev/core`/`@acta-dev/web` at the consumer.
//
// Usage: node scripts/smoke-published.mjs [version]
//   version defaults to $ACTA_VERSION or "latest".

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const version = process.argv[2] ?? process.env.ACTA_VERSION ?? "latest";
const spec = `@acta-dev/cli@${version}`;

const dir = mkdtempSync(join(tmpdir(), "acta-smoke-"));
const bin = join(dir, "node_modules", ".bin", "acta");
let failed = false;

function run(cmd, args, opts = {}) {
  process.stdout.write(`\n$ ${cmd} ${args.join(" ")}\n`);
  execFileSync(cmd, args, { cwd: dir, stdio: "inherit", ...opts });
}

function assert(cond, message) {
  if (!cond) throw new Error(`Assertion failed: ${message}`);
  process.stdout.write(`  ok: ${message}\n`);
}

try {
  process.stdout.write(`Smoke testing ${spec} in ${dir}\n`);

  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "acta-smoke", private: true }));

  // Install the published CLI + its full dependency tree from the registry.
  run("npm", ["install", spec, "--no-audit", "--no-fund"]);
  assert(existsSync(bin), "acta bin installed");

  run(bin, ["init"]);
  assert(existsSync(join(dir, "acta.config.ts")), "init wrote acta.config.ts");

  run(bin, ["new", "adr", "Smoke Test Decision"]);
  run(bin, ["validate"]);
  run(bin, ["build"]);
  assert(existsSync(join(dir, ".acta", "dist", "documents.json")), "build wrote artifacts");

  // The heavy one: prebuilt viewer resolved from npm + Astro build on the user's docs.
  run(bin, ["site"]);
  const indexHtml = join(dir, ".acta", "site", "index.html");
  assert(existsSync(indexHtml), "site wrote index.html");
  const html = readFileSync(indexHtml, "utf8");
  assert(html.includes("<html"), "index.html looks like HTML");

  process.stdout.write("\n✓ Published packages smoke test passed\n");
} catch (error) {
  failed = true;
  process.stderr.write(`\n✗ Smoke test failed: ${error?.message ?? error}\n`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

process.exit(failed ? 1 : 0);
