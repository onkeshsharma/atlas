import { describe, expect, it, vi } from "vitest";

import {
  createMcpStdioServer,
  type AskResolution,
} from "../src/engine/mcp/stdio-server.ts";
import { parseHelperResultBody } from "../src/protocol.ts";
import { VALID_SUMMARY } from "./fixtures/ingest-summary.ts";

type Sent = Record<string, unknown>;

function harness(over: Partial<Parameters<typeof createMcpStdioServer>[0]> = {}) {
  const sent: Sent[] = [];
  const askOwner = vi.fn(async () => ({ text: "ok" }) as AskResolution);
  const submitResult = vi.fn(async () => {});
  const server = createMcpStdioServer({
    send: (m) => sent.push(m),
    askOwner,
    submitResult,
    ...over,
  });
  const call = (msg: Record<string, unknown>) => server.handleLine(JSON.stringify(msg));
  return { sent, askOwner, submitResult, server, call };
}

describe("mcp stdio server — handshake", () => {
  it("answers initialize with serverInfo + tools capability, echoing the protocol version", async () => {
    const { sent, call } = harness();
    await call({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } });
    expect(sent).toHaveLength(1);
    const r = sent[0].result as Record<string, unknown>;
    expect(r.protocolVersion).toBe("2025-06-18");
    expect((r.capabilities as Record<string, unknown>).tools).toBeDefined();
  });

  it("lists exactly ask_owner and submit_result", async () => {
    const { sent, call } = harness();
    await call({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    const tools = (sent[0].result as { tools: Array<{ name: string }> }).tools;
    expect(tools.map((t) => t.name).sort()).toEqual(["ask_owner", "submit_result"]);
  });

  it("treats notifications/initialized as a notification (no reply)", async () => {
    const { sent, call } = harness();
    await call({ jsonrpc: "2.0", method: "notifications/initialized" });
    expect(sent).toHaveLength(0);
  });

  it("ignores non-JSON lines without crashing", async () => {
    const { sent, server } = harness();
    await server.handleLine("not json {");
    await server.handleLine("");
    expect(sent).toHaveLength(0);
  });

  it("errors on an unknown request but ignores an unknown notification", async () => {
    const { sent, call } = harness();
    await call({ jsonrpc: "2.0", id: 9, method: "frobnicate" });
    expect((sent[0].error as { code: number }).code).toBe(-32601);
    await call({ jsonrpc: "2.0", method: "frobnicate-notify" });
    expect(sent).toHaveLength(1); // no new message
  });
});

describe("mcp stdio server — ask_owner", () => {
  it("BLOCKS until the resolver answers, then returns the choice", async () => {
    let resolveAsk!: (a: AskResolution) => void;
    const askOwner = vi.fn(() => new Promise<AskResolution>((r) => (resolveAsk = r)));
    const { sent, call } = harness({ askOwner });

    const pending = call({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "ask_owner", arguments: { question: "migrate or drop?", options: ["migrate", "drop"] } },
    });

    // the tool call is in flight — handler is awaiting the answer, nothing sent yet.
    await Promise.resolve();
    expect(askOwner).toHaveBeenCalledWith({ question: "migrate or drop?", options: ["migrate", "drop"] });
    expect(sent).toHaveLength(0);

    resolveAsk({ choice: "migrate" });
    await pending;

    const content = (sent[0].result as { content: Array<{ text: string }> }).content;
    expect(content[0].text).toBe("migrate");
  });

  it("falls back to free text when there is no choice", async () => {
    const { sent, call } = harness({ askOwner: async () => ({ text: "use a UNIQUE index" }) });
    await call({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "ask_owner", arguments: { question: "how?" } } });
    expect((sent[0].result as { content: Array<{ text: string }> }).content[0].text).toBe("use a UNIQUE index");
  });

  it("rejects an empty question as a tool error without calling the resolver", async () => {
    const { sent, askOwner, call } = harness();
    await call({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "ask_owner", arguments: {} } });
    expect(askOwner).not.toHaveBeenCalled();
    expect((sent[0].result as { isError?: boolean }).isError).toBe(true);
  });
});

describe("mcp stdio server — submit_result", () => {
  it("accepts a valid ingest-project body and persists it", async () => {
    const { sent, submitResult, call } = harness();
    const body = { kind: "ingest-project", summary: VALID_SUMMARY, suggestedTerms: [{ term: "Run", uses: 3 }] };
    await call({ jsonrpc: "2.0", id: 8, method: "tools/call", params: { name: "submit_result", arguments: { body } } });
    expect(submitResult).toHaveBeenCalledWith(body);
    expect((sent[0].result as { content: Array<{ text: string }> }).content[0].text).toMatch(/Accepted ingest-project/);
  });

  it("rejects a malformed body in-band and does NOT persist (Engine can retry in-turn)", async () => {
    const { sent, submitResult, call } = harness();
    await call({
      jsonrpc: "2.0",
      id: 10,
      method: "tools/call",
      params: { name: "submit_result", arguments: { body: { kind: "draft-brief" /* missing body */ } } },
    });
    expect(submitResult).not.toHaveBeenCalled();
    expect((sent[0].result as { isError?: boolean }).isError).toBe(true);
  });

  it("errors on an unknown tool name", async () => {
    const { sent, call } = harness();
    await call({ jsonrpc: "2.0", id: 11, method: "tools/call", params: { name: "rm_rf", arguments: {} } });
    expect((sent[0].error as { code: number }).code).toBe(-32601);
  });
});

describe("parseHelperResultBody", () => {
  it("accepts each kind and rejects mismatches", () => {
    expect(parseHelperResultBody({ kind: "draft-brief", body: "hi" })).toEqual({ kind: "draft-brief", body: "hi" });
    expect(parseHelperResultBody({ kind: "enrich-ticket", enrichment: { a: 1 } })).toEqual({
      kind: "enrich-ticket",
      enrichment: { a: 1 },
    });
    // ADR-0008 — ingest-project summary is now validated strictly (see
    // ingest-summary-validation.test.ts); {} is no longer a valid summary.
    expect(parseHelperResultBody({ kind: "ingest-project", summary: { schemaVersion: 99 } })).toBeNull();
    // mismatches
    expect(parseHelperResultBody({ kind: "draft-brief" })).toBeNull();
    expect(parseHelperResultBody({ kind: "draft-brief", body: "" })).toBeNull();
    expect(parseHelperResultBody({ kind: "enrich-ticket" })).toBeNull();
    expect(parseHelperResultBody({ kind: "ingest-project" })).toBeNull();
    expect(parseHelperResultBody({ kind: "ingest-project", summary: {}, suggestedTerms: [{ term: "x" }] })).toBeNull();
    expect(parseHelperResultBody({ kind: "what" })).toBeNull();
    expect(parseHelperResultBody(null)).toBeNull();
    expect(parseHelperResultBody("nope")).toBeNull();
  });
});
