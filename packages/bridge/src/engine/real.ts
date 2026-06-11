/**
 * RealEngineAdapter — spawns Claude Code in the run's worktree
 * (v1 prior art: lib/engine-spawner.ts — the deny-list settings file,
 * --settings <abs path>, brief-over-stdin, SIGTERM/SIGKILL shape all
 * survive; rewritten for v2's bidirectional stream-json session).
 *
 * NEVER exercised by suites or e2e (charter hard wall) — a single real
 * smoke run is Onkesh's acceptance treat. Keep this honest and
 * defensive; anything it can't parse degrades to plain stdout.
 *
 * needs-input: with `--input-format stream-json` the session stays open
 * on stdin; permission prompts surface as control_request frames and
 * the Owner's answer returns as a control_response. If a Claude Code
 * version doesn't emit them in this mode, the run simply streams to
 * completion — watch + cancel still hold (the v2.0 floor).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { NeedsInputAnswer, NeedsInputQuestion } from "../protocol.ts";
import { superviseChild } from "./process-session.ts";
import type { EngineAdapter, EngineOutcome, EngineSession, EngineStartArgs } from "./types.ts";

/**
 * v1 T33/T36: the Bridge is the sole publisher — the Engine may not
 * push, PR, or fetch the open web. Written to the SANDBOX (never the
 * worktree, so it can't ride a diff — the v1 T36 leak).
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

export function realEngineAdapter(): EngineAdapter {
  return {
    flavor: "real",
    start(args: EngineStartArgs): EngineSession {
      let cancelled = false;
      let timedOut = false;
      let resultSubtype: string | null = null;
      let resultText = "";
      let pendingControlRequestId: string | null = null;
      let pendingPermission = false;
      let resolveStarted: () => void = () => {};

      const started = new Promise<void>((resolve) => {
        resolveStarted = resolve;
      });
      let answerSink: ((answer: NeedsInputAnswer) => void) | null = null;
      let cancelSink: (() => void) | null = null;

      const brief =
        args.order.briefBody ??
        `${args.order.title}\n\n${args.order.ticket?.body ?? ""}`.trim();

      const sessionPromise: Promise<EngineOutcome> = (async () => {
        const settingsDir = join(args.sandbox, ".claude");
        const settingsPath = join(settingsDir, "settings.json");
        await mkdir(settingsDir, { recursive: true });
        await writeFile(settingsPath, SETTINGS_JSON, "utf8");
        await writeFile(join(args.sandbox, "brief.md"), brief, "utf8");

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
          ],
          cwd: args.worktree ?? args.sandbox,
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
              case "control_request": {
                // permission prompt — surface as needs-input (PRD #3).
                const request = frame.request as Record<string, unknown> | undefined;
                pendingControlRequestId = String(frame.request_id ?? "");
                pendingPermission = true;
                args.onQuestion({
                  kind: "permission",
                  prompt:
                    `The Engine asks to use ${String(request?.tool_name ?? "a tool")}.` +
                    (request?.input ? ` Input: ${JSON.stringify(request.input).slice(0, 400)}` : ""),
                  options: ["Allow", "Deny"],
                  raisedAt: new Date().toISOString(),
                } satisfies NeedsInputQuestion);
                break;
              }
              case "result":
                resultSubtype = String(frame.subtype ?? "unknown");
                resultText = typeof frame.result === "string" ? frame.result : "";
                break;
              default:
                // unknown frame — keep the raw line visible, never lose output.
                args.onStdout(`${line}\n`);
            }
          },
          onStderr: (text) => args.onStdout(text),
        });

        resolveStarted();

        // open the session with the brief as the first user turn.
        supervised.child.stdin.write(
          `${JSON.stringify({
            type: "user",
            message: { role: "user", content: [{ type: "text", text: brief }] },
          })}\n`,
        );

        const answerWriter = (answer: NeedsInputAnswer) => {
          if (pendingPermission && pendingControlRequestId) {
            const allow = (answer.choice ?? answer.text ?? "").toLowerCase() !== "deny";
            supervised.child.stdin.write(
              `${JSON.stringify({
                type: "control_response",
                response: {
                  request_id: pendingControlRequestId,
                  subtype: "success",
                  response: { behavior: allow ? "allow" : "deny" },
                },
              })}\n`,
            );
            pendingPermission = false;
            pendingControlRequestId = null;
            return;
          }
          // free-form question fallback: a fresh user turn.
          supervised.child.stdin.write(
            `${JSON.stringify({
              type: "user",
              message: {
                role: "user",
                content: [{ type: "text", text: answer.text ?? answer.choice ?? "" }],
              },
            })}\n`,
          );
        };
        answerSink = answerWriter;
        cancelSink = () => supervised.kill();

        const code = await supervised.exited;
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
            // the real Engine's helper deliverables are a Session B+
            // concern (structured artifact contract); fail honestly
            // rather than fabricate one.
            return {
              result: "failed",
              failureKind: "engine-crash",
              detail: "real-engine helper artifact contract not implemented (fake adapter covers helpers)",
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

      return {
        answer(answer: NeedsInputAnswer) {
          void started.then(() => answerSink?.(answer));
        },
        cancel() {
          cancelled = true;
          void started.then(() => cancelSink?.());
        },
        done: sessionPromise,
      };
    },
  };
}
