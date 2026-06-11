/**
 * Shared child-process supervisor (v1 engine-spawner prior art: the
 * spawn/timeout/SIGTERM-then-SIGKILL/cleanup shape, rewritten). Both
 * adapters run their Engine through this; only the command line and the
 * line protocol differ.
 */
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

const KILL_GRACE_MS = 5_000;

export type SupervisedChild = {
  child: ChildProcessWithoutNullStreams;
  /** resolves with the exit code (or -1 on spawn error) exactly once. */
  exited: Promise<number>;
  /** SIGTERM now, SIGKILL after grace. */
  kill: () => void;
};

export function superviseChild(opts: {
  command: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs: number;
  onTimeout?: () => void;
  /** called per stdout LINE (CR/LF normalized). */
  onStdoutLine: (line: string) => void;
  onStderr?: (text: string) => void;
}): SupervisedChild {
  const child = spawn(opts.command, opts.args, {
    cwd: opts.cwd,
    env: opts.env ?? process.env,
    stdio: ["pipe", "pipe", "pipe"],
  });

  let killTimer: ReturnType<typeof setTimeout> | null = null;
  const kill = () => {
    try {
      child.kill("SIGTERM");
    } catch {
      // already dead
    }
    killTimer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        // already dead
      }
    }, KILL_GRACE_MS);
  };

  const timeoutTimer = setTimeout(() => {
    opts.onTimeout?.();
    kill();
  }, opts.timeoutMs);

  let lineBuf = "";
  child.stdout.on("data", (b: Buffer | string) => {
    lineBuf += typeof b === "string" ? b : b.toString("utf8");
    let nl: number;
    while ((nl = lineBuf.indexOf("\n")) >= 0) {
      const line = lineBuf.slice(0, nl).replace(/\r$/, "");
      lineBuf = lineBuf.slice(nl + 1);
      opts.onStdoutLine(line);
    }
  });
  child.stderr.on("data", (b: Buffer | string) => {
    opts.onStderr?.(typeof b === "string" ? b : b.toString("utf8"));
  });

  const exited = new Promise<number>((resolve) => {
    let settled = false;
    const settle = (code: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutTimer);
      if (killTimer) clearTimeout(killTimer);
      if (lineBuf) {
        opts.onStdoutLine(lineBuf.replace(/\r$/, ""));
        lineBuf = "";
      }
      resolve(code);
    };
    child.on("error", () => settle(-1));
    child.on("exit", (code) => settle(code ?? -1));
  });

  return { child, exited, kill };
}
