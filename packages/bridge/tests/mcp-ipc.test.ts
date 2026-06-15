import net from "node:net";

import { afterEach, describe, expect, it, vi } from "vitest";

import { connectIpc, createRunIpcServer, type RunIpcServer } from "../src/engine/mcp/ipc.ts";
import type { HelperResultBody } from "../src/protocol.ts";

let server: RunIpcServer | null = null;
afterEach(async () => {
  await server?.close();
  server = null;
});

describe("mcp ipc — child ↔ daemon round-trip", () => {
  it("relays an Ask and returns the resolver's answer", async () => {
    const onAsk = vi.fn(async () => ({ choice: "migrate" }));
    server = createRunIpcServer({ token: "t0", onAsk, onResult: () => {} });
    const port = await server.port;
    const client = connectIpc({ port, token: "t0" });

    const answer = await client.ask({ question: "migrate or drop?", options: ["migrate", "drop"] });

    expect(onAsk).toHaveBeenCalledWith({ question: "migrate or drop?", options: ["migrate", "drop"] });
    expect(answer).toEqual({ text: undefined, choice: "migrate" });
    client.close();
  });

  it("relays the human-only flag through to the daemon handler (ADR-0007 §4)", async () => {
    const onAsk = vi.fn(async () => ({ choice: "no" }));
    server = createRunIpcServer({ token: "th", onAsk, onResult: () => {} });
    const client = connectIpc({ port: await server.port, token: "th" });

    await client.ask({ question: "drop prod?", options: ["yes", "no"], humanOnly: true });

    expect(onAsk).toHaveBeenCalledWith({ question: "drop prod?", options: ["yes", "no"], humanOnly: true });
    client.close();
  });

  it("relays submit_result and acks; captures the body", async () => {
    let captured: HelperResultBody | null = null;
    server = createRunIpcServer({
      token: "t1",
      onAsk: async () => ({}),
      onResult: (b) => {
        captured = b;
      },
    });
    const client = connectIpc({ port: await server.port, token: "t1" });

    const body: HelperResultBody = { kind: "draft-brief", body: "the brief" };
    await client.result(body);

    expect(captured).toEqual(body);
    client.close();
  });

  it("rejects (throws) when onResult NAKs", async () => {
    server = createRunIpcServer({
      token: "t2",
      onAsk: async () => ({}),
      onResult: () => {
        throw new Error("bad deliverable");
      },
    });
    const client = connectIpc({ port: await server.port, token: "t2" });

    await expect(client.result({ kind: "draft-brief", body: "x" })).rejects.toThrow(/bad deliverable/);
    client.close();
  });

  it("drops frames bearing the wrong token (no answer sent)", async () => {
    const onAsk = vi.fn(async () => ({ choice: "yes" }));
    server = createRunIpcServer({ token: "right", onAsk, onResult: () => {} });
    const port = await server.port;

    // raw client with the WRONG token
    const raw = net.connect({ port, host: "127.0.0.1" });
    await new Promise<void>((r) => raw.on("connect", () => r()));
    let gotData = false;
    raw.on("data", () => {
      gotData = true;
    });
    raw.write(`${JSON.stringify({ type: "ask", id: 1, token: "WRONG", question: "?" })}\n`);

    await new Promise((r) => setTimeout(r, 150));
    expect(gotData).toBe(false);
    expect(onAsk).not.toHaveBeenCalled();
    raw.end();
  });
});
