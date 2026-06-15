/**
 * Athena bridge consult (ADR-0007 §2, Phase 2) — the repo-aware delegate tier.
 *
 * The Bridge runs a one-shot `claude` consult using its OWN Claude auth (no
 * Atlas API key), optionally IN the Run's worktree so the consult can read the
 * actual code before deciding. It is deliberately DUMB: Atlas builds the prompt
 * and parses/gates the verdict (one source of decision logic) — this just runs
 * Claude and returns the final text.
 *
 * NEVER exercised by suites (charter wall: real Claude only via acceptance
 * smoke); the daemon uses the fake path in tests/e2e.
 */
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Bridge-as-sole-publisher floor — the consult can READ the repo but never
 *  destroy the box or publish (machine-safety floor holds even under Ultra). */
const CONSULT_SETTINGS = JSON.stringify({
  permissions: {
    deny: [
      "Bash(rm -rf ~/*)",
      "Bash(rm -rf /)",
      "Bash(rm -rf $HOME*)",
      "Bash(curl http*)",
      "WebFetch(http://*)",
      "Bash(gh*)",
      "Bash(git push*)",
      "Write",
      "Edit",
    ],
  },
});

export type RunConsultArgs = {
  systemPrompt: string;
  userPrompt: string;
  /** repo-aware: cwd = the Run's worktree so the consult can read the code. */
  worktree?: string;
  timeoutMs: number;
  /** override the engine command (defaults to ATLAS_ENGINE_COMMAND ?? "claude"). */
  command?: string;
};

/**
 * Run a one-shot Claude consult; resolves with the assistant's final text (the
 * JSON verdict Atlas parses). Read-only (Write/Edit denied) + machine-safety
 * floor. Rejects on non-zero exit or timeout.
 */
export async function runConsult(args: RunConsultArgs): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), "athena-consult-"));
  const settingsPath = join(sandbox, "settings.json");
  await writeFile(settingsPath, CONSULT_SETTINGS, "utf8");

  try {
    return await new Promise<string>((resolve, reject) => {
      const child = spawn(
        args.command ?? process.env.ATLAS_ENGINE_COMMAND ?? "claude",
        [
          "-p",
          args.userPrompt,
          "--append-system-prompt",
          args.systemPrompt,
          "--dangerously-skip-permissions",
          "--settings",
          settingsPath,
        ],
        {
          cwd: args.worktree ?? sandbox,
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let out = "";
      let err = "";
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("consult timed out"));
      }, args.timeoutMs);
      child.stdout.on("data", (d: Buffer) => (out += d.toString()));
      child.stderr.on("data", (d: Buffer) => (err += d.toString()));
      child.on("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
      child.on("exit", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve(out.trim());
        else reject(new Error(`consult exited ${code}: ${err.slice(0, 300)}`));
      });
    });
  } finally {
    await rm(sandbox, { recursive: true, force: true }).catch(() => {});
  }
}
