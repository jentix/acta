import type { DocumentGraph, GraphEdge, GraphNode } from "@acta/core";
import { buildGraph, loadProject } from "@acta/core";
import { defineCommand } from "citty";
import { resolveContext } from "../context.js";
import { exitUsage, printJson, printLine } from "../output.js";

// ---------------------------------------------------------------------------
// Mermaid serializer
// ---------------------------------------------------------------------------

const STATUS_FILL: Record<string, string> = {
  accepted: "#4ade80",
  proposed: "#60a5fa",
  rejected: "#f87171",
  deprecated: "#a3a3a3",
  superseded: "#d1d5db",
  active: "#4ade80",
  draft: "#60a5fa",
  paused: "#fbbf24",
  implemented: "#34d399",
  obsolete: "#a3a3a3",
};

function nodeLabel(node: GraphNode): string {
  // Escape quotes in title
  const safeTitle = node.title.replace(/"/g, "'");
  return `${node.id}["${node.id}<br/>${safeTitle}"]:::${node.kind}_${sanitizeStatus(node.status)}`;
}

function sanitizeStatus(status: string): string {
  return status.replace(/[^a-z0-9]/g, "_");
}

function edgeLabel(edge: GraphEdge): string {
  return `  ${edge.source} -->|${edge.type}| ${edge.target}`;
}

function toMermaid(graph: DocumentGraph): string {
  const lines: string[] = ["flowchart LR"];

  // Collect unique statuses+kinds for classDef
  const classNames = new Set<string>();

  for (const node of graph.nodes) {
    lines.push(`  ${nodeLabel(node)}`);
    classNames.add(`${node.kind}_${sanitizeStatus(node.status)}`);
  }

  if (graph.edges.length > 0) {
    lines.push("");
    for (const edge of graph.edges) {
      lines.push(edgeLabel(edge));
    }
  }

  if (classNames.size > 0) {
    lines.push("");
    for (const cls of classNames) {
      // Determine fill from status part (after last underscore of kind_status)
      const status = cls.replace(/^adr_|^spec_/, "").replace(/_/g, "");
      const fill = STATUS_FILL[status] ?? "#e5e7eb";
      lines.push(`  classDef ${cls} fill:${fill},stroke:#6b7280,color:#111827`);
    }
  }

  return lines.join("\n");
}

export const graphCommand = defineCommand({
  meta: {
    name: "graph",
    description: "Output the document relationship graph",
  },
  args: {
    format: {
      type: "string",
      alias: "f",
      description: "Output format: mermaid | json (default: mermaid)",
      default: "mermaid",
    },
    config: {
      type: "string",
      alias: "c",
      description: "Path to acta.config.ts",
    },
  },
  async run({ args }) {
    const fmt = args.format ?? "mermaid";
    if (fmt !== "mermaid" && fmt !== "json") {
      exitUsage(`Unknown format "${fmt}". Use: mermaid, json`);
    }

    const { config } = await resolveContext({ config: args.config });
    const project = await loadProject({ config });
    const graph = buildGraph(project.documents);

    if (fmt === "json") {
      printJson(graph);
    } else {
      printLine(toMermaid(graph));
    }
  },
});
