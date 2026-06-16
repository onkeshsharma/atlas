/**
 * Loopback IPC line protocol between the daemon (real.ts, inside the Bridge
 * process) and the `atlas-bridge __mcp` child that Claude Code spawns as its
 * stdio MCP server (ADR-0006).
 *
 * Why a child + IPC at all: a stdio MCP server must be an executable Claude can
 * spawn via `--mcp-config`, but a stdio *script* can't ship inside the SEA
 * binary. So the daemon re-execs ITSELF (`atlas-bridge __mcp`) as that server,
 * and the child relays Asks/results back to the daemon over this localhost TCP
 * line so they reach the real Run's needs-input + answer machinery.
 *
 * Transport: newline-delimited JSON on 127.0.0.1, an ephemeral per-Run port,
 * guarded by a per-Run token (defense-in-depth on top of loopback-only). The
 * server is created per Run by real.ts; its handlers close over that Run's
 * onQuestion/answer/result, so there is no cross-Run routing to get wrong.
 */
import net from "node:net";

import type { HelperResultBody } from "../../protocol.ts";
import type { AskResolution } from "./stdio-server.ts";

// child → daemon
type IpcRequest =
  | { type: "ask"; id: number; token: string; question: string; options?: string[]; humanOnly?: boolean }
  | { type: "result"; id: number; token: string; body: HelperResultBody };

// daemon → child
type IpcResponse =
  | { type: "answer"; id: number; text?: string; choice?: string }
  | { type: "ack"; id: number; ok: boolean; error?: string };

function writeLine(socket: net.Socket, msg: IpcRequest | IpcResponse): void {
  socket.write(`${JSON.stringify(msg)}\n`);
}

/** consume a socket's data as newline-delimited JSON, one parsed object per line. */
function onLines<T>(socket: net.Socket, onMsg: (msg: T) => void): void {
  let buf = "";
  socket.on("data", (d: Buffer) => {
    buf += d.toString();
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (!line.trim()) continue;
      let msg: T;
      try {
        msg = JSON.parse(line) as T;
      } catch {
        continue; // never crash the line on a bad frame
      }
      onMsg(msg);
    }
  });
}

export type RunIpcHandlers = {
  /** per-Run shared secret the child must echo on every frame. */
  token: string;
  /** raise the Ask; resolves when the Owner/Athena answers (may take minutes). */
  onAsk: (args: { question: string; options?: string[]; humanOnly?: boolean }) => Promise<AskResolution>;
  /** capture the validated helper deliverable; throw to NAK it. */
  onResult: (body: HelperResultBody) => void | Promise<void>;
};

export type RunIpcServer = {
  /** the ephemeral 127.0.0.1 port the child should connect to. */
  port: Promise<number>;
  close: () => Promise<void>;
};

export function createRunIpcServer(handlers: RunIpcHandlers): RunIpcServer {
  const server = net.createServer((socket) => {
    onLines<IpcRequest>(socket, (msg) => {
      if (msg.token !== handlers.token) return; // unauthorized — drop silently
      if (msg.type === "ask") {
        // .then(call) so a SYNC throw in onAsk becomes a rejection, not an
        // uncaught exception in the socket handler (which would never reply).
        void Promise.resolve()
          .then(() =>
            handlers.onAsk({
              question: msg.question,
              options: msg.options,
              ...(msg.humanOnly ? { humanOnly: true } : {}),
            }),
          )
          .then((ans) => writeLine(socket, { type: "answer", id: msg.id, text: ans.text, choice: ans.choice }))
          .catch((err: unknown) =>
            // an Ask that errors out still needs a frame back so the child unblocks.
            writeLine(socket, { type: "answer", id: msg.id, text: `Ask failed: ${String(err)}` }),
          );
      } else if (msg.type === "result") {
        void Promise.resolve()
          .then(() => handlers.onResult(msg.body))
          .then(() => writeLine(socket, { type: "ack", id: msg.id, ok: true }))
          .catch((err: unknown) =>
            writeLine(socket, { type: "ack", id: msg.id, ok: false, error: String(err) }),
          );
      }
    });
  });

  const port = new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (addr && typeof addr === "object") resolve(addr.port);
      else reject(new Error("ipc server: no port"));
    });
  });

  return {
    port,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

export type IpcClient = {
  ask: (args: { question: string; options?: string[]; humanOnly?: boolean }) => Promise<AskResolution>;
  result: (body: HelperResultBody) => Promise<void>;
  close: () => void;
};

export function connectIpc(opts: { port: number; token: string; host?: string }): IpcClient {
  const socket = net.connect({ port: opts.port, host: opts.host ?? "127.0.0.1" });
  socket.setNoDelay(true);
  let nextId = 1;
  const pending = new Map<number, (r: IpcResponse) => void>();

  onLines<IpcResponse>(socket, (msg) => {
    const resolve = pending.get(msg.id);
    if (resolve) {
      pending.delete(msg.id);
      resolve(msg);
    }
  });

  const rpc = (
    req:
      | { type: "ask"; question: string; options?: string[]; humanOnly?: boolean }
      | { type: "result"; body: HelperResultBody },
  ): Promise<IpcResponse> =>
    new Promise<IpcResponse>((resolve) => {
      const id = nextId++;
      pending.set(id, resolve);
      // net.connect queues writes until the socket is connected — safe to write now.
      writeLine(socket, { ...req, id, token: opts.token });
    });

  return {
    ask: async (args) => {
      const r = await rpc({
        type: "ask",
        question: args.question,
        options: args.options,
        ...(args.humanOnly ? { humanOnly: true } : {}),
      });
      return r.type === "answer" ? { text: r.text, choice: r.choice } : {};
    },
    result: async (body) => {
      const r = await rpc({ type: "result", body });
      if (r.type === "ack" && !r.ok) throw new Error(r.error ?? "result rejected");
    },
    close: () => socket.end(),
  };
}
