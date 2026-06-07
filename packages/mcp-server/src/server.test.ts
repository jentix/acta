import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveConfig } from "@acta-dev/core";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { describe, expect, it } from "vitest";
import { createActaServer } from "./server.js";
import type { ActaMcpContext } from "./tools.js";

describe("Acta FastMCP server", () => {
  it("serves tools and resources over Streamable HTTP", async () => {
    await withFixture(async (context) => {
      const port = await findFreePort();
      if (port === undefined) {
        return;
      }
      const server = createActaServer(context);
      await server.start({
        transportType: "httpStream",
        httpStream: {
          host: "127.0.0.1",
          port,
        },
      });

      const client = new Client(
        { name: "acta-mcp-test-client", version: "1.0.0" },
        { capabilities: {} },
      );

      try {
        await client.connect(
          new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`)),
        );

        const tools = await client.listTools();
        expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
          "acta_build",
          "acta_graph",
          "acta_list",
          "acta_new",
          "acta_search",
          "acta_show",
          "acta_validate",
        ]);

        const listed = await client.callTool({
          name: "acta_list",
          arguments: { kind: "adr" },
        });
        const listedPayload = JSON.parse(toolText(listed));
        expect(listedPayload).toEqual([expect.objectContaining({ id: "ADR-0001" })]);

        const docs = await client.readResource({ uri: "acta://docs" });
        expect(JSON.parse(resourceText(docs))).toEqual([
          expect.objectContaining({ id: "ADR-0001" }),
        ]);
      } finally {
        await client.close();
        await server.stop();
      }
    });
  });
});

function toolText(result: Awaited<ReturnType<Client["callTool"]>>): string {
  if (
    Array.isArray(result.content) &&
    result.content[0] &&
    typeof result.content[0] === "object" &&
    "type" in result.content[0] &&
    result.content[0].type === "text" &&
    "text" in result.content[0] &&
    typeof result.content[0].text === "string"
  ) {
    return result.content[0].text;
  }

  throw new Error("Expected text tool result.");
}

function resourceText(result: Awaited<ReturnType<Client["readResource"]>>): string {
  const first = result.contents[0];
  if (first && "text" in first) {
    return first.text;
  }

  throw new Error("Expected text resource result.");
}

async function withFixture(test: (context: ActaMcpContext) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "acta-mcp-server-test-"));
  const config = resolveConfig(
    {
      docs: {
        adrDir: "docs/decisions",
        specDir: "docs/specs",
        templatesDir: "docs/templates",
      },
      validation: {
        orphanDocuments: "off",
      },
    },
    { rootDir: root },
  );

  try {
    await mkdir(config.resolvedDocs.adrDir, { recursive: true });
    await mkdir(config.resolvedDocs.specDir, { recursive: true });
    await mkdir(config.resolvedDocs.templatesDir, { recursive: true });
    await writeFile(join(config.resolvedDocs.adrDir, "ADR-0001-use-markdown.md"), adr(), "utf8");

    await test({ rootDir: root, config });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function findFreePort(): Promise<number | undefined> {
  return new Promise((resolvePromise, reject) => {
    const server = createServer();
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EPERM") {
        resolvePromise(undefined);
        return;
      }
      reject(error);
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") {
          resolvePromise(address.port);
        } else {
          reject(new Error("Failed to allocate test port."));
        }
      });
    });
  });
}

function adr(): string {
  return `---
id: ADR-0001
kind: adr
title: Use Markdown
status: accepted
date: 2026-06-01T00:00:00.000Z
tags: [docs]
component: [acta-core]
owners: [Ada]
summary: Markdown docs.
links:
  related: []
  supersedes: []
  replacedBy: []
  decidedBy: []
  dependsOn: []
  validates: []
  references: []
---

# Context

Context.

# Decision

Decision.

# Consequences

Consequences.

# Alternatives

Alternatives.
`;
}
