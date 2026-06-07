---
id: SPEC-0010
kind: spec
title: FastMCP server and shared search
status: implemented
date: 2026-06-07T13:41:13.117Z
tags: [mcp, agents, search]
component: [acta-mcp-server, acta-core, acta-cli, acta-web]
owners: [Boris]
summary: Defines the Phase 4 FastMCP server and the shared Orama-backed search helper used by MCP and the web viewer.
links:
  related: [SPEC-0003, SPEC-0004, SPEC-0006, SPEC-0007]
  decidedBy: [ADR-0003]
  dependsOn: [ADR-0003, SPEC-0003, SPEC-0006, SPEC-0007]
  validates: [ADR-0003]
  references: []
---

# Summary

Phase 4 adds `@acta-dev/mcp-server`, a publishable FastMCP package with the `acta-mcp` binary. MCP clients can inspect, create, validate, search, graph, and build Acta documents through structured tools and resources instead of scraping CLI output.

The implementation also moves Orama-backed document search into `@acta-dev/core/search`. The web viewer and MCP server now share the same search behavior while keeping browser builds away from Node-only core entrypoints.

# Goals

- Expose Acta's canonical document pipeline to MCP clients without duplicating parser, validator, graph, artifact, or search logic.
- Support stdio by default for local agents and Streamable HTTP for local or trusted-network MCP clients.
- Keep MCP outputs stable, JSON-shaped, and easy for agents to parse.
- Keep web search and MCP search aligned through one core helper.
- Let `acta init --mcp` scaffold project-level MCP configuration.

# Requirements

- `@acta-dev/mcp-server` must be a public workspace package with bin `acta-mcp`.
- `acta-mcp` must default to stdio and support `--http`, `--host`, `--port`, `--config`, `--help`, and `--version`.
- The server must register tools: `acta_new`, `acta_validate`, `acta_list`, `acta_show`, `acta_graph`, `acta_search`, and `acta_build`.
- The server must register resources: `acta://docs` and `acta://doc/{id}`.
- Missing document IDs must return a structured not-found error instead of an unhelpful stack trace.
- `acta_new` may write Markdown documents; `acta_build` may write `.acta/dist`; the other tools must be read-only.
- `@acta-dev/core/search` must export `searchDocuments` and search-index types without forcing browser consumers to import the root Node-oriented core bundle.
- `acta init --mcp` must write or merge an `acta` entry in `.mcp.json` while preserving unrelated MCP servers.

# Proposed design

The MCP server is a thin FastMCP adapter. Handler functions in `packages/mcp-server/src/tools.ts` call `@acta-dev/core` APIs directly and return plain JSON-compatible objects. `server.ts` registers those handlers as FastMCP tools with Zod input schemas and basic MCP annotations for read-only and mutating operations.

Resources are implemented as JSON text resources: `acta://docs` returns document summaries, and `acta://doc/{id}` returns the normalized document. Transport selection stays in the CLI entrypoint: stdio is the default, while `--http` starts FastMCP's Streamable HTTP transport at `/mcp`.

Search behavior now lives in `packages/core/src/search.ts`. The root core API still exports `searchDocuments` for Node consumers, and the dedicated `@acta-dev/core/search` subpath gives browser code a small search-only import that avoids bundling config/scanner modules.

`acta init --mcp` treats MCP config as repository scaffolding. It merges `.mcp.json`, adds an `acta` server using `npx -y @acta-dev/mcp-server`, and leaves existing server entries untouched.

# Open questions

- Whether future MCP releases should add prompt templates for common documentation workflows.
- Whether remote HTTP deployments need first-party auth guidance or should remain documented as trusted-network only.
