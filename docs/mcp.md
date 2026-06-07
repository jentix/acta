# Acta MCP Server

Acta ships `@acta-dev/mcp-server` for MCP clients that need structured access to
ADR and spec documents. The server is a thin FastMCP layer over `@acta-dev/core`,
so parsing, validation, graph building, artifact generation and search behavior
match the CLI and web viewer.

## Install

In an Acta-enabled repository:

```sh
pnpm add -D @acta-dev/mcp-server
pnpm exec acta init --mcp
```

`acta init --mcp` writes or updates `.mcp.json`:

```json
{
  "mcpServers": {
    "acta": {
      "command": "npx",
      "args": ["-y", "@acta-dev/mcp-server"],
      "env": {}
    }
  }
}
```

The generated config uses `npx` so MCP clients can launch the server from the
repository root without a separate global install.

## Transports

Default local-agent mode is stdio:

```sh
acta-mcp
acta-mcp --config ./acta.config.ts
```

Streamable HTTP is available for local test clients and trusted-network setups:

```sh
acta-mcp --http --host 127.0.0.1 --port 3333
```

The HTTP endpoint is `http://127.0.0.1:3333/mcp`. FastMCP also exposes an SSE
compatibility endpoint at `/sse`.

## Client Setup

Claude Desktop, Claude Code, Cursor and other MCP clients can use the generated
`.mcp.json` shape directly when they support project-level MCP config. If your
client expects a manual entry, configure:

```json
{
  "command": "npx",
  "args": ["-y", "@acta-dev/mcp-server"]
}
```

Run the MCP client from the repository root, or pass a config path:

```json
{
  "command": "npx",
  "args": ["-y", "@acta-dev/mcp-server", "--config", "acta.config.ts"]
}
```

## Tools

| Tool | Purpose |
|---|---|
| `acta_new` | Create an ADR or spec from the configured template. |
| `acta_validate` | Return structured validation results. |
| `acta_list` | List documents with optional kind/status/tag/component/owner filters. |
| `acta_show` | Return one normalized document with links and backlinks. |
| `acta_graph` | Return the document graph. |
| `acta_search` | Search metadata or full document content. |
| `acta_build` | Build `.acta/dist` artifacts and return manifest counts. |

Tool outputs are JSON text payloads so agents can parse them without scraping
human terminal output.

## Resources

| Resource | Purpose |
|---|---|
| `acta://docs` | JSON list of document summaries. |
| `acta://doc/{id}` | Full normalized document JSON for one ID. |

Missing document IDs return a structured not-found error with code
`ACTA_NOT_FOUND`.

## Security

The MCP server reads and writes files in the Acta project. `acta_new` creates
Markdown documents and `acta_build` writes `.acta/dist` artifacts. Treat HTTP
mode as local or trusted-network only unless it is placed behind external access
control such as a VPN, reverse proxy auth, or an MCP client gateway.
