/**
 * Stdio MCP server for the Atlas engine back-channel (ADR-0006).
 *
 * Speaks newline-delimited JSON-RPC (the MCP stdio transport) and exposes two
 * tools to the Engine (Claude Code):
 *
 *  - `ask_owner(question, options?)` — BLOCKS until a resolver (Owner or Athena)
 *    answers; the answer returns as the tool result so the Engine continues in
 *    the SAME turn. This is how a free-text decision becomes a needs-input Ask
 *    (Gap 1) instead of streaming to stdout and hanging.
 *  - `submit_result(body)` — the Engine's structured helper deliverable,
 *    validated at the call site (`parseHelperResultBody`) so a malformed body is
 *    rejected and the Engine retries BEFORE the turn ends (Gap 3).
 *
 * This module is PURE protocol: it owns no transport and no run state. The
 * `__mcp` CLI subcommand wires `handleLine` to process.stdin and `send` to
 * process.stdout, and routes `askOwner`/`submitResult` over the daemon IPC line.
 * Tests drive `handleLine` directly and assert on `send`. The fake engine keeps
 * its own `@@ATLAS:*` sentinel protocol; this is the real engine's channel only.
 */
import { parseHelperResultBody, type HelperResultBody } from "../../protocol.ts";

/** what a resolved Ask carries back (mirrors NeedsInputAnswer's answer fields). */
export type AskResolution = { text?: string; choice?: string };

export type McpStdioServerOptions = {
  /** write one JSON-RPC message (the caller appends the newline / framing). */
  send: (message: Record<string, unknown>) => void;
  /** raise the Ask and resolve when the Owner/Athena answers (may take minutes). */
  askOwner: (args: { question: string; options?: string[]; humanOnly?: boolean }) => Promise<AskResolution>;
  /** persist the validated helper deliverable. */
  submitResult: (body: HelperResultBody) => Promise<void>;
  /** server identity (defaults are fine; overridable for tests). */
  serverInfo?: { name: string; version: string };
};

const DEFAULT_PROTOCOL_VERSION = "2024-11-05";

const TOOLS = [
  {
    name: "ask_owner",
    description:
      "Ask the Atlas Owner a decision you cannot make confidently yourself (free-text, " +
      "multiple-choice, or approval). BLOCKS until answered, then returns the answer. " +
      "Use sparingly — prefer sensible defaults; only ask when a wrong guess is costly.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "The decision to put to the Owner." },
        options: {
          type: "array",
          items: { type: "string" },
          description: "Optional discrete choices the Owner can pick from.",
        },
        human_only: {
          type: "boolean",
          description:
            "Set true when this decision is high-stakes or irreversible and MUST be made by " +
            "the human Owner — Athena (the AFK delegate) will not auto-answer it, even on a " +
            "confident guess. Use for destructive, security, or one-way-door choices.",
        },
      },
      required: ["question"],
    },
  },
  {
    name: "submit_result",
    description:
      "Deliver this helper Run's structured result. Required to finish a helper Run; the " +
      "Run only succeeds by calling this. body.kind is one of enrich-ticket | draft-brief | " +
      "ingest-project.",
    inputSchema: {
      type: "object",
      properties: {
        body: {
          type: "object",
          description:
            "{ kind: 'enrich-ticket', enrichment } | { kind: 'draft-brief', body: string } | " +
            "{ kind: 'ingest-project', summary, suggestedTerms?: [{term, uses}] }",
        },
      },
      required: ["body"],
    },
  },
];

function textResult(text: string, isError = false): Record<string, unknown> {
  return { content: [{ type: "text", text }], ...(isError ? { isError: true } : {}) };
}

export type McpStdioServer = { handleLine: (line: string) => Promise<void> };

export function createMcpStdioServer(opts: McpStdioServerOptions): McpStdioServer {
  const serverInfo = opts.serverInfo ?? { name: "atlas-bridge", version: "1" };

  const reply = (id: unknown, result: Record<string, unknown>) =>
    opts.send({ jsonrpc: "2.0", id, result });
  const replyError = (id: unknown, code: number, message: string) =>
    opts.send({ jsonrpc: "2.0", id, error: { code, message } });

  async function callTool(id: unknown, params: Record<string, unknown> | undefined) {
    const name = params?.name;
    const args = (params?.arguments ?? {}) as Record<string, unknown>;

    if (name === "ask_owner") {
      const question = typeof args.question === "string" ? args.question : "";
      if (!question) {
        reply(id, textResult("ask_owner requires a non-empty `question`.", true));
        return;
      }
      const options = Array.isArray(args.options) ? args.options.map(String) : undefined;
      const humanOnly = args.human_only === true;
      const answer = await opts.askOwner({ question, options, ...(humanOnly ? { humanOnly } : {}) });
      reply(id, textResult(answer.choice ?? answer.text ?? ""));
      return;
    }

    if (name === "submit_result") {
      const body = parseHelperResultBody(args.body);
      if (!body) {
        // reject in-band so the Engine fixes and retries within the turn.
        reply(
          id,
          textResult(
            "Invalid result body. Expected { kind: 'enrich-ticket', enrichment } | " +
              "{ kind: 'draft-brief', body } | { kind: 'ingest-project', summary, suggestedTerms? }.",
            true,
          ),
        );
        return;
      }
      await opts.submitResult(body);
      reply(id, textResult(`Accepted ${body.kind} deliverable.`));
      return;
    }

    replyError(id, -32601, `unknown tool: ${String(name)}`);
  }

  async function handleLine(line: string): Promise<void> {
    const trimmed = line.trim();
    if (!trimmed) return;
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      return; // not JSON — ignore (never crash the transport)
    }
    const { id, method, params } = msg as {
      id?: unknown;
      method?: string;
      params?: Record<string, unknown>;
    };

    switch (method) {
      case "initialize":
        reply(id, {
          protocolVersion:
            (params?.protocolVersion as string | undefined) ?? DEFAULT_PROTOCOL_VERSION,
          serverInfo,
          capabilities: { tools: {} },
        });
        return;
      case "notifications/initialized":
      case "initialized":
        return; // notification — no response
      case "ping":
        reply(id, {});
        return;
      case "tools/list":
        reply(id, { tools: TOOLS });
        return;
      case "tools/call":
        await callTool(id, params);
        return;
      default:
        // unknown REQUEST (has id) must get an error; unknown notification is ignored.
        if (id !== undefined) replyError(id, -32601, `unknown method: ${String(method)}`);
        return;
    }
  }

  return { handleLine };
}
