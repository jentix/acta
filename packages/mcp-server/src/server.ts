import { FastMCP, UserError } from "fastmcp";
import { z } from "zod";
import { ActaMcpError } from "./errors.js";
import { listDocsResource, readDocResource } from "./resources.js";
import {
  type ActaMcpContext,
  actaBuild,
  actaGraph,
  actaList,
  actaNew,
  actaSearch,
  actaShow,
  actaValidate,
} from "./tools.js";

export const actaMcpVersion = "1.0.0";

const kindSchema = z.enum(["adr", "spec"]);

export function createActaServer(context: ActaMcpContext): FastMCP {
  const server = new FastMCP({
    name: "Acta",
    version: actaMcpVersion,
    instructions:
      "Use Acta tools to inspect, create, validate, search, and build ADR/spec documents in the current repository.",
  });

  server.addTool({
    name: "acta_new",
    description: "Create a new ADR or spec from the configured Acta template.",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    parameters: z.object({
      kind: kindSchema,
      title: z.string().min(1),
      status: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
    execute: async (args) => jsonToolResult(await actaNew(context, args)),
  });

  server.addTool({
    name: "acta_validate",
    description: "Validate the current Acta project and return structured validation issues.",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    parameters: z.object({}),
    execute: async () => jsonToolResult(await actaValidate(context)),
  });

  server.addTool({
    name: "acta_list",
    description: "List Acta documents with optional metadata filters.",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    parameters: z.object({
      kind: kindSchema.optional(),
      status: z.string().optional(),
      tag: z.string().optional(),
      component: z.string().optional(),
      owner: z.string().optional(),
    }),
    execute: async (args) => jsonToolResult(await actaList(context, args)),
  });

  server.addTool({
    name: "acta_show",
    description: "Show one Acta document, including metadata, sections, links, and backlinks.",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    parameters: z.object({
      id: z.string().min(1),
    }),
    execute: async (args) => jsonToolResult(await actaShow(context, args)),
  });

  server.addTool({
    name: "acta_graph",
    description: "Return the Acta document graph.",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    parameters: z.object({}),
    execute: async () => jsonToolResult(await actaGraph(context)),
  });

  server.addTool({
    name: "acta_search",
    description: "Search Acta documents using the shared Orama-backed search index.",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    parameters: z.object({
      query: z.string(),
      kind: kindSchema.optional(),
      includeContent: z.boolean().optional(),
    }),
    execute: async (args) => jsonToolResult(await actaSearch(context, args)),
  });

  server.addTool({
    name: "acta_build",
    description: "Build Acta artifacts and return the manifest plus validation summary.",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    parameters: z.object({}),
    execute: async () => jsonToolResult(await actaBuild(context)),
  });

  server.addResource({
    name: "acta_docs",
    uri: "acta://docs",
    mimeType: "application/json",
    description: "List of Acta documents in the current project.",
    load: async () => listDocsResource(context),
  });

  server.addResourceTemplate({
    name: "acta_doc",
    uriTemplate: "acta://doc/{id}",
    mimeType: "application/json",
    description: "One Acta document by ID.",
    arguments: [{ name: "id", required: true, description: "Document ID, e.g. ADR-0001." }],
    load: async (args) => readDocResource(context, { id: args.id }),
  });

  return server;
}

function jsonToolResult(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function toUserError(error: unknown): UserError {
  if (error instanceof ActaMcpError) {
    return new UserError(
      JSON.stringify({
        code: error.code,
        message: error.message,
        details: error.details ?? {},
      }),
    );
  }

  if (error instanceof Error) {
    return new UserError(error.message);
  }

  return new UserError(String(error));
}
