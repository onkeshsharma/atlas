/**
 * `atlas-bridge __mcp` — the stdio MCP server Claude Code spawns via
 * `--mcp-config` (ADR-0006). It is the daemon's OWN binary re-exec'd, so it
 * ships inside the SEA with no sibling script. It speaks MCP over stdio to
 * Claude and relays Asks/results to the daemon over the loopback IPC line
 * (`ATLAS_MCP_PORT` + `ATLAS_MCP_TOKEN`, injected by real.ts via mcp-config env).
 *
 * It owns no decision logic — `stdio-server.ts` owns the protocol, `ipc.ts`
 * owns the relay. This file is the ~stdin/stdout glue and is intentionally thin.
 */
import { connectIpc } from "./ipc.ts";
import { createMcpStdioServer } from "./stdio-server.ts";

export async function runMcpChild(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const port = Number(env.ATLAS_MCP_PORT);
  const token = env.ATLAS_MCP_TOKEN ?? "";
  if (!Number.isInteger(port) || port <= 0 || !token) {
    console.error("__mcp: missing/invalid ATLAS_MCP_PORT or ATLAS_MCP_TOKEN");
    process.exit(1);
  }

  const ipc = connectIpc({ port, token });
  const server = createMcpStdioServer({
    send: (m) => process.stdout.write(`${JSON.stringify(m)}\n`),
    askOwner: (a) => ipc.ask(a),
    submitResult: (b) => ipc.result(b),
  });

  let buf = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (d: string) => {
    buf += d;
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      void server.handleLine(line);
    }
  });

  // stay alive until Claude closes our stdin (its MCP transport ends), then exit.
  await new Promise<void>((resolve) => process.stdin.on("end", resolve));
  ipc.close();
}
