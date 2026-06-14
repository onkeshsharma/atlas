/**
 * RealEngineAdapter — spawns Claude Code in the run's worktree with a
 * structured back-channel (ADR-0006). v1 prior art: lib/engine-spawner.ts
 * (deny-list settings file, --settings <abs path>, brief-over-stdin,
 * SIGTERM/SIGKILL shape all survive).
 *
 * NEVER exercised by suites or e2e (charter hard wall) — a single real smoke
 * run is Onkesh's acceptance treat. Keep this honest and defensive; anything it
 * can't parse degrades to plain stdout.
 *
 * The back-channel (replaces the dead `--dangerously-skip-permissions`
 * control_request path):
 *   - The daemon hosts a per-Run loopback IPC server and re-execs itself as a
 *     stdio MCP server (`atlas-bridge __mcp`) passed to Claude via --mcp-config.
 *   - `ask_owner` → onQuestion (needs-input); the tool BLOCKS until answer()
 *     resolves it, so a question is answered IN-TURN — Gap 1 fixed.
 *   - `submit_result` → a validated HelperResultBody → helper-complete — Gap 3.
 *   - The stream-json `result` frame is the turn boundary: we close stdin so the
 *     process exits instead of hanging to the wall clock — Gap 2 fixed.
 */
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { HelperResultBody, NeedsInputAnswer, NeedsInputQuestion } from "../protocol.ts";
import { createRunIpcServer } from "./mcp/ipc.ts";
import type { AskResolution } from "./mcp/stdio-server.ts";
import { superviseChild } from "./process-session.ts";
import type { EngineAdapter, EngineOutcome, EngineSession, EngineStartArgs } from "./types.ts";

/**
 * v1 T33/T36: the Bridge is the sole publisher — the Engine may not push, PR, or
 * fetch the open web. Written to the SANDBOX (never the worktree, so it can't
 * ride a diff — the v1 T36 leak).
 */
const SETTINGS_JSON = JSON.stringify(
  {
    permissions: {
      deny: [
        "Bash(rm -rf ~/*)",
        "Bash(rm -rf /)",
        "Bash(rm -rf $HOME*)",
        "Bash(curl http*)",
        "WebFetch(http://*)",
        "Bash(gh*)",
        "Bash(git push*)",
      ],
    },
  },
  null,
  2,
);

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((block) =>
      typeof block === "object" && block !== null && "text" in block
        ? String((block as { text: unknown }).text)
        : "",
    )
    .join("");
}

/**
 * How to invoke `atlas-bridge __mcp` as Claude's stdio MCP server. In a SEA
 * binary, process.execPath IS the binary and there is no script path; from
 * source (Node 24 TS-direct), spawn node + the CLI entry. Mirrors
 * start.ts spawnDetached's SEA detection.
 */
async function mcpChildCommand(): Promise<{ command: string; args: string[] }> {
  let isSea = false;
  try {
    const sea = await import("node:sea");
    isSea = sea.isSea();
  } catch {
    isSea = false;
  }
  return isSea
    ? { command: process.execPath, args: ["__mcp"] }
    : { command: process.execPath, args: [process.argv[1], "__mcp"] };
}

export function realEngineAdapter(): EngineAdapter {
  return {
    flavor: "real",
    start(args: EngineStartArgs): EngineSession {
      let cancelled = false;
      let timedOut = false;
      let resultSubtype: string | null = null;
      let resultText = "";
      let helperResult: HelperResultBody | null = null;
      let resolveStarted: () => void = () => {};

      // single-slot Ask handshake: the Engine asks one thing at a time and
      // blocks on the tool result, so one pending resolver is sufficient. If an
      // answer somehow arrives first, stash it for the next Ask.
      let pendingAsk: ((a: AskResolution) => void) | null = null;
      let queuedAnswer: AskResolution | null = null;

      const started = new Promise<void>((resolve) => {
        resolveStarted = resolve;
      });
      let cancelSink: (() => void) | null = null;
      let enginePid: number | undefined; // M17 — resource sampling (best-effort)

      const brief =
        args.order.briefBody ?? `${args.order.title}\n\n${args.order.ticket?.body ?? ""}`.trim();

      const sessionPromise: Promise<EngineOutcome> = (async () => {
        const token = randomBytes(16).toString("hex");

        // IPC server: ask_owner → needs-input + await answer(); submit_result →
        // capture the deliverable. Closes over this Run only.
        const ipc = createRunIpcServer({
          token,
          onAsk: ({ question, options }) => {
            args.onQuestion({
              kind: "question",
              prompt: question,
              ...(options && options.length ? { options } : {}),
              raisedAt: new Date().toISOString(),
            } satisfies NeedsInputQuestion);
            if (queuedAnswer) {
              const a = queuedAnswer;
              queuedAnswer = null;
              return Promise.resolve(a);
            }
            return new Promise<AskResolution>((resolve) => {
              pendingAsk = resolve;
            });
          },
          onResult: (body) => {
            helperResult = body;
          },
        });
        const ipcPort = await ipc.port;

        const settingsDir = join(args.sandbox, ".claude");
        const settingsPath = join(settingsDir, "settings.json");
        await mkdir(settingsDir, { recursive: true });
        await writeFile(settingsPath, SETTINGS_JSON, "utf8");
        await writeFile(join(args.sandbox, "brief.md"), brief, "utf8");

        // per-Run mcp-config: Claude spawns `__mcp`, which dials our IPC port.
        const child = await mcpChildCommand();
        const mcpConfigPath = join(args.sandbox, "mcp-config.json");
        await writeFile(
          mcpConfigPath,
          JSON.stringify({
            mcpServers: {
              atlas: {
                command: child.command,
                args: child.args,
                env: { ATLAS_MCP_PORT: String(ipcPort), ATLAS_MCP_TOKEN: token },
              },
            },
          }),
          "utf8",
        );

        const supervised = superviseChild({
          command: process.env.ATLAS_ENGINE_COMMAND ?? "claude",
          args: [
            "--print",
            "--verbose",
            "--output-format",
            "stream-json",
            "--input-format",
            "stream-json",
            "--dangerously-skip-permissions",
            "--settings",
            settingsPath,
            "--mcp-config",
            mcpConfigPath,
            "--strict-mcp-config",
          ],
          cwd: args.worktree ?? args.sandbox,
          // MCP_TOOL_TIMEOUT must cover the longest Ask wait; bound it by the
          // run's own wall clock so a never-answered Ask still fails honestly.
          env: {
            ...process.env,
            MCP_TIMEOUT: "60000",
            MCP_TOOL_TIMEOUT: String(args.timeoutMs),
          },
          timeoutMs: args.timeoutMs,
          onTimeout: () => {
            timedOut = true;
          },
          onStdoutLine: (line) => {
            if (!line.trim()) return;
            let frame: Record<string, unknown>;
            try {
              frame = JSON.parse(line) as Record<string, unknown>;
            } catch {
              args.onStdout(`${line}\n`);
              return;
            }
            switch (frame.type) {
              case "system":
                args.onStdout(`[engine] session ${String(frame.session_id ?? "?")} started\n`);
                break;
              case "assistant": {
                const message = frame.message as Record<string, unknown> | undefined;
                const text = extractText(message?.content);
                if (text) args.onStdout(text.endsWith("\n") ? text : `${text}\n`);
                break;
              }
              case "result":
                // turn boundary (ADR-0006 / Gap 2): record, then close stdin so
                // the process exits instead of waiting for more input forever.
                resultSubtype = String(frame.subtype ?? "unknown");
                resultText = typeof frame.result === "string" ? frame.result : "";
                supervised.child.stdin.end();
                break;
              default:
                // unknown frame — keep the raw line visible, never lose output.
                args.onStdout(`${line}\n`);
            }
          },
          onStderr: (text) => args.onStdout(text),
        });

        resolveStarted();
        enginePid = supervised.child.pid;
        cancelSink = () => supervised.kill();

        // open the session with the brief as the first (and only) user turn.
        // We keep stdin open so the `result` handler can close it deterministically.
        supervised.child.stdin.write(
          `${JSON.stringify({
            type: "user",
            message: { role: "user", content: [{ type: "text", text: brief }] },
          })}\n`,
        );

        const code = await supervised.exited;
        await ipc.close();

        if (cancelled) return { result: "cancelled" };
        if (timedOut) {
          return {
            result: "failed",
            failureKind: "engine-timeout",
            detail: "engine hit the Bridge wall clock",
          };
        }
        if (resultSubtype === "success") {
          if (args.order.lane === "helper") {
            return helperResult
              ? { result: "helper-complete", payload: helperResult }
              : {
                  result: "failed",
                  failureKind: "engine-crash",
                  detail: "helper finished without calling submit_result",
                };
          }
          return { result: "review-ready" };
        }
        return {
          result: "failed",
          failureKind: code === 0 ? "no-changes" : "engine-crash",
          detail: resultText || `engine exited ${code} (${resultSubtype ?? "no result frame"})`,
        };
      })();

      const deliver = (answer: NeedsInputAnswer) => {
        const resolution: AskResolution = { text: answer.text, choice: answer.choice };
        if (pendingAsk) {
          const resolve = pendingAsk;
          pendingAsk = null;
          resolve(resolution);
        } else {
          queuedAnswer = resolution;
        }
      };

      return {
        answer(answer: NeedsInputAnswer) {
          void started.then(() => deliver(answer));
        },
        cancel() {
          cancelled = true;
          void started.then(() => cancelSink?.());
        },
        done: sessionPromise,
        get pid() {
          return enginePid;
        },
      };
    },
  };
}
