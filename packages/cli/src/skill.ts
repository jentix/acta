import {
  adrStatuses,
  documentKinds,
  internalLinkKeys,
  linkKeys,
  resolveConfig,
  specStatuses,
} from "@acta-dev/core";

// ---------------------------------------------------------------------------
// Skill generation — single source of truth for the acta-document agent skill.
//
// The volatile parts of the skill (kinds, statuses, link types, required
// sections, command surface) are interpolated here from @acta-dev/core's
// canonical exports. Never hand-edit the generated SKILL.md files: run
// `pnpm gen:skill` and commit the result. `skill-contract.test.ts` fails CI
// if the committed copies drift from this renderer or from core's constants.
// ---------------------------------------------------------------------------

export const SKILL_NAME = "acta-document";

// Human descriptions for each link key. Keyed by core's `linkKeys` so the
// contract test can assert every link key has a description (add a link key to
// core without describing it here → test goes red).
const LINK_DESCRIPTIONS: Record<(typeof linkKeys)[number], string> = {
  related: "Loosely related documents.",
  supersedes: "This document supersedes the target; mirror with `replacedBy`.",
  replacedBy: "This document is replaced by the target.",
  decidedBy: "This spec was decided by an ADR.",
  dependsOn: "This document depends on the target decision.",
  validates: "This spec validates/implements an ADR decision.",
  references: "External URLs only; must be valid http(s).",
};

function table(header: string[], rows: string[][]): string {
  const head = `| ${header.join(" | ")} |`;
  const sep = `| ${header.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
  return [head, sep, body].join("\n");
}

/**
 * Render the universal SKILL.md content from the live core/CLI surface.
 * Deterministic: same inputs → byte-identical output (guarded by contract test).
 */
export function renderSkill(): string {
  const config = resolveConfig({}, { rootDir: process.cwd() });
  const dirFor: Record<(typeof documentKinds)[number], string> = {
    adr: config.docs.adrDir,
    spec: config.docs.specDir,
  };
  const prefixFor: Record<(typeof documentKinds)[number], string> = {
    adr: config.ids.adrPrefix,
    spec: config.ids.specPrefix,
  };
  const required = config.validation.requiredSections;

  const kindRows = documentKinds.map((kind) => [
    `\`${kind}\``,
    `\`${prefixFor[kind]}\``,
    `\`${dirFor[kind]}/\``,
  ]);

  const linkRows = linkKeys.map((key) => [
    `\`${key}\``,
    key === "references" ? "external" : "internal",
    LINK_DESCRIPTIONS[key],
  ]);

  const frontmatter = [
    "---",
    `name: ${SKILL_NAME}`,
    "description: >-",
    "  Create and maintain Acta ADR/spec documents with the `acta` CLI. Use after",
    "  implementing a feature, fixing a notable bug, or making an architectural",
    "  decision, or when asked to document a decision, write an ADR, or create a spec.",
    "allowed-tools: Bash",
    "---",
  ].join("\n");

  return `${frontmatter}

# Acta: document decisions and specs

Acta is a docs-as-code CLI that keeps Architecture Decision Records (ADRs) and
specs validated and linked in Git. Drive it through the \`acta\` binary; every
data command supports \`--json\` for reliable parsing. **Never scrape human
output — always pass \`--json\` and parse stdout.** Human logs go to stderr.

## When to use

- After implementing a feature or system → write a \`spec\`.
- After making an architectural decision (or choosing between options) → write an \`adr\`.
- When the user asks to "document this decision", "write an ADR", or "create a spec".

## Document model

${table(["Kind", "ID prefix", "Directory"], kindRows)}

IDs are \`<PREFIX>-<NNNN>\` (zero-padded to width ${config.ids.width}); the CLI allocates the next ID.

**ADR statuses:** ${adrStatuses.map((s) => `\`${s}\``).join(", ")} (default \`proposed\`).
**Spec statuses:** ${specStatuses.map((s) => `\`${s}\``).join(", ")} (default \`draft\`).

### Link types (frontmatter \`links:\`)

${table(["Key", "Kind", "Meaning"], linkRows)}

Internal link keys (${internalLinkKeys.map((k) => `\`${k}\``).join(", ")}) reference other
document IDs. \`references\` holds external URLs only.

### Required sections

- **ADR:** ${required.adr.map((s) => `\`# ${s}\``).join(", ")}
- **Spec:** ${required.spec.map((s) => `\`# ${s}\``).join(", ")}

## Procedure

1. **Pick the kind.** Architectural decision → \`adr\`. Feature/system → \`spec\`.
2. **Create it** and capture the path from JSON:
   \`\`\`sh
   acta new adr "Short title" --json   # or: acta new spec "Short title" --json
   \`\`\`
   Returns \`{ "id", "kind", "title", "status", "path", "relativePath" }\`. Edit \`path\`.
3. **Fill frontmatter:** set \`status\`, \`tags\`, \`component\`, \`owners\`, a one-line
   \`summary\`, and \`links\` (use the link types above; \`references\` for external URLs).
4. **Fill required sections** (see above) with real content — no placeholders.
5. **Validate and fix-loop:**
   \`\`\`sh
   acta validate --json
   \`\`\`
   Returns \`{ "valid", "errorCount", "warningCount", "issues": [{ severity, code, documentId, message, path, line }] }\`.
   If \`valid\` is \`false\`, fix each \`issues[].message\` and re-run. Repeat until
   \`valid\` is \`true\` (cap at ~5 iterations; if still failing, report the issues).
6. **Verify links** with \`acta show <id> --json\` (inspect \`links\` and \`backlinks\`).

## Command reference (all accept \`--json\` unless noted)

- \`acta new adr|spec "<title>" [--status <s>] [--tags a,b] [--id <ID>]\` → created doc.
- \`acta list [--kind adr|spec] [--status <s>] [--tag <t>]\` → array of documents.
- \`acta show <id>\` → one normalized document with \`links\` + \`backlinks\`.
- \`acta validate\` → validation result; exit \`1\` if invalid.
- \`acta graph --format json|mermaid|dot\` → relationship graph.
- \`acta build\` → build manifest (\`documentCount\`, \`errorCount\`, \`warningCount\`).

Exit codes: \`0\` ok · \`1\` validation/operation failure · \`2\` usage error.
`;
}

// Delimiters for the AGENTS.md block. The init command replaces everything
// between them idempotently so non-Claude agents (Codex/Cursor/Gemini) get the
// same guidance from a file they already read.
export const AGENTS_BLOCK_START = "<!-- acta:skill:start -->";
export const AGENTS_BLOCK_END = "<!-- acta:skill:end -->";

/** Render the condensed block injected into a user's AGENTS.md. */
export function renderAgentsBlock(): string {
  const adr = adrStatuses.join(", ");
  const spec = specStatuses.join(", ");
  return `${AGENTS_BLOCK_START}
## Documenting work with Acta

After implementing a feature or making an architectural decision, record it with
the \`acta\` CLI (always use \`--json\` and parse stdout):

1. \`acta new adr|spec "Title" --json\` — \`adr\` for decisions, \`spec\` for features. Capture \`path\`.
2. Fill frontmatter (\`status\`, \`tags\`, \`component\`, \`owners\`, \`summary\`, \`links\`) and required sections.
3. \`acta validate --json\` — fix each \`issues[].message\` and repeat until \`valid\` is \`true\`.
4. \`acta show <id> --json\` — verify \`links\`/\`backlinks\`.

ADR statuses: ${adr}. Spec statuses: ${spec}. Link keys: ${linkKeys.join(", ")}.
${AGENTS_BLOCK_END}`;
}

/** Inject or replace the acta block in an AGENTS.md body. Returns updated body. */
export function upsertAgentsBlock(existing: string): string {
  const block = renderAgentsBlock();
  const start = existing.indexOf(AGENTS_BLOCK_START);
  const end = existing.indexOf(AGENTS_BLOCK_END);
  if (start !== -1 && end !== -1 && end > start) {
    const before = existing.slice(0, start);
    const after = existing.slice(end + AGENTS_BLOCK_END.length);
    return `${before}${block}${after}`;
  }
  const trimmed = existing.replace(/\s+$/, "");
  return trimmed.length > 0 ? `${trimmed}\n\n${block}\n` : `${block}\n`;
}
