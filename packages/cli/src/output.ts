import type { ValidationIssue } from "@acta/core";
import kleur from "kleur";

// ---------------------------------------------------------------------------
// Print helpers
// ---------------------------------------------------------------------------

export function printLine(msg = ""): void {
  process.stdout.write(`${msg}\n`);
}

export function printError(msg: string): void {
  process.stderr.write(`${kleur.red("error")} ${msg}\n`);
}

export function printWarn(msg: string): void {
  process.stderr.write(`${kleur.yellow("warn")} ${msg}\n`);
}

export function printSuccess(msg: string): void {
  process.stdout.write(`${kleur.green("✓")} ${msg}\n`);
}

export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

// ---------------------------------------------------------------------------
// Exit helpers
// ---------------------------------------------------------------------------

export function exitOk(): never {
  process.exit(0);
}

export function exitFailure(msg?: string): never {
  if (msg) printError(msg);
  process.exit(1);
}

export function exitUsage(msg: string): never {
  process.stderr.write(`${kleur.red("usage error")} ${msg}\n`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Validation issue formatting
// ---------------------------------------------------------------------------

export function printIssues(issues: ValidationIssue[]): void {
  for (const issue of issues) {
    const prefix = issue.severity === "error" ? kleur.red("✗ error") : kleur.yellow("⚠ warn ");
    const location = issue.documentId ? kleur.bold(issue.documentId) : (issue.path ?? "");
    printLine(`  ${prefix}  ${location}  ${issue.message}`);
  }
}

export function printValidationSummary(
  errorCount: number,
  warningCount: number,
  valid: boolean,
): void {
  if (valid) {
    printSuccess(
      `Validation passed  ${kleur.dim(`(${warningCount} warning${warningCount !== 1 ? "s" : ""})`)}`,
    );
  } else {
    printLine(
      `  ${kleur.red(`${errorCount} error${errorCount !== 1 ? "s" : ""}`)}` +
        `  ${kleur.yellow(`${warningCount} warning${warningCount !== 1 ? "s" : ""}`)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Table helpers
// ---------------------------------------------------------------------------

export function printTable(rows: string[][]): void {
  if (rows.length === 0) return;
  const widths = rows[0]?.map((_, col) => Math.max(...rows.map((row) => (row[col] ?? "").length)));
  for (const row of rows) {
    printLine(row.map((cell, col) => cell.padEnd(widths[col] ?? 0)).join("  "));
  }
}
