#!/usr/bin/env node
import { resolveMcpContext } from "./context.js";
import { actaMcpVersion, createActaServer } from "./server.js";

interface CliOptions {
  config?: string;
  help: boolean;
  host: string;
  http: boolean;
  port: number;
  version: boolean;
}

async function main(argv: string[]): Promise<void> {
  const options = parseArgs(argv);

  if (options.help) {
    console.log(helpText());
    return;
  }

  if (options.version) {
    console.log(actaMcpVersion);
    return;
  }

  const context = await resolveMcpContext({ config: options.config });
  const server = createActaServer(context);

  if (options.http) {
    await server.start({
      transportType: "httpStream",
      httpStream: {
        host: options.host,
        port: options.port,
      },
    });
    console.error(`Acta MCP listening on http://${options.host}:${options.port}/mcp`);
    return;
  }

  await server.start({
    transportType: "stdio",
  });
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    help: false,
    host: "127.0.0.1",
    http: false,
    port: 3333,
    version: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case "--config":
      case "-c": {
        const value = argv[index + 1];
        if (!value) throw new Error(`${arg} requires a path.`);
        options.config = value;
        index += 1;
        break;
      }
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--host": {
        const value = argv[index + 1];
        if (!value) throw new Error("--host requires a value.");
        options.host = value;
        index += 1;
        break;
      }
      case "--http":
        options.http = true;
        break;
      case "--port": {
        const value = argv[index + 1];
        if (!value) throw new Error("--port requires a value.");
        const port = Number.parseInt(value, 10);
        if (!Number.isInteger(port) || port <= 0) {
          throw new Error("--port must be a positive integer.");
        }
        options.port = port;
        index += 1;
        break;
      }
      case "--version":
      case "-v":
        options.version = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function helpText(): string {
  return `acta-mcp

Usage:
  acta-mcp [--config acta.config.ts]
  acta-mcp --http [--host 127.0.0.1] [--port 3333] [--config acta.config.ts]

Options:
  --config, -c   Path to acta.config.ts
  --http         Start Streamable HTTP transport instead of stdio
  --host         HTTP host (default: 127.0.0.1)
  --port         HTTP port (default: 3333)
  --version, -v  Print version
  --help, -h     Print help
`;
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
