/**
 * M10 — the daemon's doctor assembly (doctor.ts): table-tested over the
 * injectable exec/fs/sync seams — no real spawns, no network. Honest
 * verdicts only: every check maps to a failure kind the runner can
 * actually produce (no-repo / worktree-failed / gh-cli-error) or to a
 * real operational fact (sync, stale worktrees, lock, engine).
 */
import { describe, expect, it } from "vitest";

import { runDoctor, type DoctorContext, type ExecProbe } from "../src/doctor.ts";

function execTable(table: Record<string, { exitCode: number; stdout?: string; stderr?: string }>): ExecProbe {
  return async (cmd, args) => {
    const key = [cmd, ...args].join(" ");
    for (const [pattern, result] of Object.entries(table)) {
      if (key.startsWith(pattern)) {
        return { exitCode: result.exitCode, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
      }
    }
    return { exitCode: -1, stdout: "", stderr: `${cmd}: not found` };
  };
}

function ctx(overrides: Partial<DoctorContext>): DoctorContext {
  return {
    projects: [],
    keepWorktreeRunIds: [],
    version: "2.0.0-test",
    engine: "fake",
    lockPort: 9230,
    dataDir: "/tmp/bridge",
    runningRunIds: [],
    exec: execTable({
      "git --version": { exitCode: 0, stdout: "git version 2.49.0\n" },
      "gh auth status": { exitCode: 0, stdout: "Logged in\n" },
      git: { exitCode: 0, stdout: ".git\n" },
    }),
    syncProbe: async () => ({ cap: 2, queued: 1 }),
    listWorktreeDirs: () => [],
    ...overrides,
  };
}

function byKey(result: Awaited<ReturnType<typeof runDoctor>>, key: string) {
  const check = result.checks.find((c) => c.key === key);
  if (!check) throw new Error(`missing check ${key}`);
  return check;
}

describe("runDoctor", () => {
  it("all-green: sync, git, gh, repos, worktrees, lock, engine", async () => {
    const result = await runDoctor(
      ctx({ projects: [{ slug: "acme", localPath: "/work/acme" }] }),
    );
    expect(result.engine).toBe("fake");
    expect(result.lockPort).toBe(9230);
    expect(byKey(result, "atlas-sync")).toMatchObject({ status: "pass", detail: "cap 2 · 1 queued" });
    expect(byKey(result, "git")).toMatchObject({ status: "pass", detail: "git version 2.49.0" });
    expect(byKey(result, "gh").status).toBe("pass");
    expect(byKey(result, "repo:acme")).toMatchObject({ status: "pass", detail: "/work/acme" });
    expect(byKey(result, "worktrees").status).toBe("pass");
    expect(byKey(result, "lock").status).toBe("pass");
    expect(byKey(result, "engine").status).toBe("pass");
    expect(Date.parse(result.ranAt)).not.toBeNaN();
  });

  it("sync failure is a FAIL with the honest first line", async () => {
    const result = await runDoctor(
      ctx({ syncProbe: async () => { throw new Error("sync returned 503\nstack…"); } }),
    );
    expect(byKey(result, "atlas-sync")).toMatchObject({
      status: "fail",
      detail: "Error: sync returned 503",
    });
  });

  it("missing git FAILS; missing gh only WARNS (local merges still work)", async () => {
    const result = await runDoctor(ctx({ exec: execTable({}) }));
    expect(byKey(result, "git").status).toBe("fail");
    expect(byKey(result, "gh")).toMatchObject({ status: "warn" });
    expect(byKey(result, "gh").detail).toContain("gh-cli-error");
  });

  it("a broken repo path fails ITS check only (no-repo territory)", async () => {
    const result = await runDoctor(
      ctx({
        projects: [
          { slug: "good", localPath: "/work/good" },
          { slug: "bad", localPath: "/work/bad" },
        ],
        exec: execTable({
          "git --version": { exitCode: 0, stdout: "git version 2.49.0" },
          "gh auth status": { exitCode: 0 },
          "git -C /work/good": { exitCode: 0, stdout: ".git" },
          "git -C /work/bad": { exitCode: 128, stderr: "fatal: not a git repository" },
        }),
      }),
    );
    expect(byKey(result, "repo:good").status).toBe("pass");
    expect(byKey(result, "repo:bad")).toMatchObject({ status: "fail" });
    expect(byKey(result, "repo:bad").detail).toContain("/work/bad");
    expect(byKey(result, "repo:bad").detail).toContain("not a git repository");
  });

  it("no projects with a local_path is a WARN (dispatch would fail no-repo)", async () => {
    const result = await runDoctor(ctx({}));
    expect(byKey(result, "repos")).toMatchObject({ status: "warn" });
  });

  it("stale worktrees: dirs that are neither running here nor legitimately kept", async () => {
    const result = await runDoctor(
      ctx({
        listWorktreeDirs: () => ["r-running", "r-kept", "r-stale-1", "r-stale-2"],
        runningRunIds: ["r-running"],
        keepWorktreeRunIds: ["r-kept"],
      }),
    );
    const check = byKey(result, "worktrees");
    expect(check.status).toBe("warn");
    expect(check.detail).toContain("2 stale");
    expect(check.detail).toContain("r-stale-1");
  });

  it("real engine probes the claude binary; missing = FAIL", async () => {
    const found = await runDoctor(
      ctx({
        engine: "real",
        exec: execTable({
          "git --version": { exitCode: 0, stdout: "git version 2.49.0" },
          "gh auth status": { exitCode: 0 },
          "claude --version": { exitCode: 0, stdout: "2.1.0 (Claude Code)" },
        }),
      }),
    );
    expect(byKey(found, "engine")).toMatchObject({ status: "pass", detail: "2.1.0 (Claude Code)" });

    const missing = await runDoctor(
      ctx({
        engine: "real",
        exec: execTable({
          "git --version": { exitCode: 0, stdout: "git version 2.49.0" },
          "gh auth status": { exitCode: 0 },
        }),
      }),
    );
    expect(byKey(missing, "engine").status).toBe("fail");
  });
});
