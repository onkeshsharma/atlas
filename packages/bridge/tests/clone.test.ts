/**
 * M18 — clone module unit tests with an injected GitExecFn.
 * No real git, no network — pure function logic.
 */
import { mkdirSync, rmdirSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ensureClonedRepo, projectRepoDir, resolveProjectsHome } from "../src/clone.ts";
import type { GitExecFn } from "../src/worktrees.ts";

let tmpDir: string;

beforeEach(() => {
  tmpDir = join(os.tmpdir(), `atlas-clone-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmdirSync(tmpDir, { recursive: true });
});

describe("resolveProjectsHome", () => {
  it("defaults to ~/atlas/projects", () => {
    const old = process.env.ATLAS_PROJECTS_HOME;
    delete process.env.ATLAS_PROJECTS_HOME;
    const home = resolveProjectsHome();
    expect(home).toBe(join(os.homedir(), "atlas", "projects"));
    if (old !== undefined) process.env.ATLAS_PROJECTS_HOME = old;
  });

  it("honors ATLAS_PROJECTS_HOME override", () => {
    process.env.ATLAS_PROJECTS_HOME = "/custom/home";
    const home = resolveProjectsHome();
    expect(home).toBe("/custom/home");
    delete process.env.ATLAS_PROJECTS_HOME;
  });
});

describe("projectRepoDir", () => {
  it("joins home + slug", () => {
    // Use os.join to stay portable across platforms (Windows uses backslash).
    expect(projectRepoDir(join("/home", "atlas", "projects"), "my-app")).toBe(
      join("/home", "atlas", "projects", "my-app"),
    );
  });
});

describe("ensureClonedRepo", () => {
  it("fresh clone — exit 0 → ok:true, cloned:true, path", async () => {
    let cloneCalled = false;
    const exec: GitExecFn = async (args) => {
      if (args[0] === "clone") {
        cloneCalled = true;
        return { stdout: "", stderr: "", exitCode: 0 };
      }
      return { stdout: "", stderr: "", exitCode: 1 };
    };

    const result = await ensureClonedRepo({
      repoUrl: "https://github.com/test/repo",
      slug: "test-repo",
      projectsHome: tmpDir,
      exec,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cloned).toBe(true);
      expect(result.path).toBe(join(tmpDir, "test-repo"));
    }
    expect(cloneCalled).toBe(true);
  });

  it("clone nonzero → ok:false with stderr detail", async () => {
    const exec: GitExecFn = async (args) => {
      if (args[0] === "clone") {
        return { stdout: "", stderr: "repository not found", exitCode: 128 };
      }
      return { stdout: "", stderr: "", exitCode: 1 };
    };

    const result = await ensureClonedRepo({
      repoUrl: "https://github.com/test/missing",
      slug: "missing",
      projectsHome: tmpDir,
      exec,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.detail).toContain("repository not found");
    }
  });

  it("dest exists and is a git work tree → reuse, cloned:false, no clone call", async () => {
    const slug = "existing-repo";
    const dest = join(tmpDir, slug);
    mkdirSync(dest, { recursive: true });

    let cloneCalled = false;
    const exec: GitExecFn = async (args) => {
      if (args[0] === "rev-parse") {
        return { stdout: "true\n", stderr: "", exitCode: 0 };
      }
      if (args[0] === "clone") {
        cloneCalled = true;
        return { stdout: "", stderr: "", exitCode: 0 };
      }
      return { stdout: "", stderr: "", exitCode: 1 };
    };

    const result = await ensureClonedRepo({
      repoUrl: "https://github.com/test/repo",
      slug,
      projectsHome: tmpDir,
      exec,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cloned).toBe(false);
      expect(result.path).toBe(dest);
    }
    expect(cloneCalled).toBe(false);
  });

  it("dest exists but is NOT a git repo → ok:false", async () => {
    const slug = "bad-dir";
    const dest = join(tmpDir, slug);
    mkdirSync(dest, { recursive: true });

    const exec: GitExecFn = async (args) => {
      if (args[0] === "rev-parse") {
        // NOT a git repo
        return { stdout: "", stderr: "not a git repository", exitCode: 128 };
      }
      return { stdout: "", stderr: "", exitCode: 1 };
    };

    const result = await ensureClonedRepo({
      repoUrl: "https://github.com/test/repo",
      slug,
      projectsHome: tmpDir,
      exec,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.detail).toContain("exists and is not an Atlas clone");
    }
  });
});
