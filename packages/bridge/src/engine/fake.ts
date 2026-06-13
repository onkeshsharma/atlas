/**
 * FakeEngineAdapter — spawns the scripted binary
 * (./fake-engine-script.ts) as a REAL child process, so the supervisor,
 * stdout streaming, answer-over-stdin and kill paths are all exercised
 * for real. Suites and e2e run on this and only this (charter hard wall).
 */
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

import {
  FAILURE_KINDS,
  type FailureKind,
  type HelperResultBody,
  type NeedsInputAnswer,
  type NeedsInputQuestion,
} from "../protocol.ts";
import { superviseChild } from "./process-session.ts";
import type { EngineAdapter, EngineOutcome, EngineSession, EngineStartArgs } from "./types.ts";

/**
 * Lazily resolve the fake-engine script path.
 *
 * BP4 FIX: The original code resolved this at MODULE TOP LEVEL using
 * `new URL(..., import.meta.url)`. In a Node SEA / CJS bundle there is no
 * valid `import.meta.url`, so every import of this module crashed with
 * `TypeError: Invalid URL` — even on the real-engine path.
 *
 * Fix: compute the path INSIDE the spawn function, only when the fake engine
 * actually runs. We use `__dirname` / `import.meta.url` guarded by the CJS
 * check so the same source works in both ESM (Node 24 direct) and CJS (SEA).
 */
function getFakeEngineScriptPath(): string {
  // In CJS bundles (SEA), `import.meta` is unavailable — use a relative path
  // from the known bundle location via process.execPath sibling heuristic.
  // In ESM (Node 24 direct execution), `import.meta.url` is valid.
  try {
    // ESM path — works when running from source with Node 24 TS-direct
    return fileURLToPath(new URL("./fake-engine-script.ts", import.meta.url));
  } catch {
    // CJS/SEA fallback — resolve relative to this file's assumed dist location.
    // The SEA bundles everything together; fake-engine-script is not embedded
    // (it must be run by a fresh node process). In practice the SEA/prod path
    // never uses the fake engine; this branch satisfies type-safety only.
    return join(dirname(process.execPath), "fake-engine-script.ts");
  }
}

type DonePayload = {
  outcome?: string;
  failureKind?: string;
  detail?: string;
};

export function fakeEngineAdapter(): EngineAdapter {
  return {
    flavor: "fake",
    start(args: EngineStartArgs): EngineSession {
      let cancelled = false;
      let timedOut = false;
      let donePayload: DonePayload | null = null;
      let resultPayload: HelperResultBody | null = null;

      const task = {
        lane: args.order.lane,
        helperKind: args.order.helperKind,
        runRef: args.order.ref,
        projectName: args.order.project.name,
        ticket: args.order.ticket
          ? {
              ref: args.order.ticket.ref,
              title: args.order.ticket.title,
              body: args.order.ticket.body,
              kind: args.order.ticket.kind,
              priority: args.order.ticket.priority,
            }
          : null,
        briefBody: args.order.briefBody,
      };

      const supervised = superviseChild({
        command: process.execPath,
        // --no-warnings: keep Node's TS-stripping notices out of the
        // run's stdout record.
        args: ["--no-warnings", getFakeEngineScriptPath()],
        cwd: args.worktree ?? args.sandbox,
        env: { ...process.env, ATLAS_FAKE_TASK: JSON.stringify(task) },
        timeoutMs: args.timeoutMs,
        onTimeout: () => {
          timedOut = true;
        },
        onStdoutLine: (line) => {
          if (line.startsWith("@@ATLAS:ASK ")) {
            try {
              const payload = JSON.parse(line.slice("@@ATLAS:ASK ".length)) as Record<
                string,
                unknown
              >;
              args.onQuestion({
                kind: payload.kind === "permission" ? "permission" : "question",
                prompt: String(payload.prompt ?? "The Engine has a question."),
                options: Array.isArray(payload.options)
                  ? payload.options.map(String)
                  : undefined,
                context: typeof payload.context === "string" ? payload.context : undefined,
                raisedAt: new Date().toISOString(),
              } satisfies NeedsInputQuestion);
            } catch {
              // malformed ask — surface it as plain stdout instead.
              args.onStdout(`${line}\n`);
            }
            return;
          }
          if (line.startsWith("@@ATLAS:RESULT ")) {
            try {
              resultPayload = JSON.parse(
                line.slice("@@ATLAS:RESULT ".length),
              ) as HelperResultBody;
            } catch {
              resultPayload = null;
            }
            return;
          }
          if (line.startsWith("@@ATLAS:DONE ")) {
            try {
              donePayload = JSON.parse(line.slice("@@ATLAS:DONE ".length)) as DonePayload;
            } catch {
              donePayload = null;
            }
            return;
          }
          args.onStdout(`${line}\n`);
        },
        onStderr: (text) => args.onStdout(text),
      });

      const done: Promise<EngineOutcome> = supervised.exited.then((code): EngineOutcome => {
        if (cancelled) return { result: "cancelled" };
        if (timedOut) {
          return {
            result: "failed",
            failureKind: "engine-timeout",
            detail: "engine hit the Bridge wall clock",
          };
        }
        if (donePayload?.outcome === "review-ready") {
          if (args.order.lane === "helper") {
            return resultPayload
              ? { result: "helper-complete", payload: resultPayload }
              : {
                  result: "failed",
                  failureKind: "engine-crash",
                  detail: "helper finished without a deliverable",
                };
          }
          return { result: "review-ready" };
        }
        if (donePayload?.outcome === "failed") {
          const kind: FailureKind = (FAILURE_KINDS as readonly string[]).includes(
            donePayload.failureKind ?? "",
          )
            ? (donePayload.failureKind as FailureKind)
            : "engine-crash";
          return {
            result: "failed",
            failureKind: kind,
            detail: donePayload.detail ?? "scripted failure",
          };
        }
        return {
          result: "failed",
          failureKind: "engine-crash",
          detail: `engine exited ${code} without finishing`,
        };
      });

      return {
        answer(answer: NeedsInputAnswer) {
          try {
            supervised.child.stdin.write(`${JSON.stringify(answer)}\n`);
          } catch {
            // session already gone — the outcome path reports it.
          }
        },
        cancel() {
          cancelled = true;
          supervised.kill();
        },
        done,
      };
    },
  };
}
