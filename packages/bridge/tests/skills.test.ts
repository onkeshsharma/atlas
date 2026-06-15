/**
 * Skills layer cores (ADR-0008 §3). The skillsUsedInFrame fixture is the REAL
 * frame captured from claude 2.1.177 (the empirical lock), so the parser is
 * pinned to ground truth, not the docs' reverse-engineering.
 */
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { constitutionHash, inventorySkills, parseSkillFrontmatter, skillsUsedInFrame } from "../src/skills.ts";

describe("parseSkillFrontmatter", () => {
  it("reads name + description and defaults invocability to true", () => {
    const fm = parseSkillFrontmatter(`---\nname: grill-with-docs\ndescription: "Interview the plan"\n---\nbody`);
    expect(fm).toEqual({
      name: "grill-with-docs",
      description: "Interview the plan",
      modelInvocable: true,
      userInvocable: true,
    });
  });

  it("honours disable-model-invocation and user-invocable: false", () => {
    const fm = parseSkillFrontmatter(
      `---\nname: deploy\ndisable-model-invocation: true\nuser-invocable: false\n---\n`,
    );
    expect(fm.modelInvocable).toBe(false);
    expect(fm.userInvocable).toBe(false);
  });

  it("returns defaults when there is no frontmatter", () => {
    expect(parseSkillFrontmatter("no frontmatter here")).toEqual({
      modelInvocable: true,
      userInvocable: true,
    });
  });
});

describe("skillsUsedInFrame — pinned to the real captured frame", () => {
  // verbatim from /tmp/skill-capture.jsonl (claude 2.1.177, empirical lock).
  const realFrame = {
    type: "assistant",
    message: {
      model: "claude-opus-4-8",
      role: "assistant",
      content: [
        { type: "tool_use", id: "toolu_01V6Vrjt86mYUgjWHdtCNRpg", name: "Skill", input: { skill: "echo-fact" }, caller: { type: "direct" } },
      ],
    },
    parent_tool_use_id: null,
  };

  it("extracts the invoked skill name from the real frame", () => {
    expect(skillsUsedInFrame(realFrame)).toEqual(["echo-fact"]);
  });

  it("handles multiple Skill tool_use blocks in one frame", () => {
    const frame = {
      type: "assistant",
      message: { content: [
        { type: "tool_use", name: "Skill", input: { skill: "a" } },
        { type: "text", text: "thinking" },
        { type: "tool_use", name: "Skill", input: { skill: "b" } },
      ] },
    };
    expect(skillsUsedInFrame(frame)).toEqual(["a", "b"]);
  });

  it("ignores non-Skill tool_use, text frames, and malformed shapes", () => {
    expect(skillsUsedInFrame({ type: "assistant", message: { content: [{ type: "tool_use", name: "Bash", input: { command: "ls" } }] } })).toEqual([]);
    expect(skillsUsedInFrame({ type: "result", subtype: "success" })).toEqual([]);
    expect(skillsUsedInFrame({ type: "assistant", message: { content: "nope" } })).toEqual([]);
    expect(skillsUsedInFrame(null)).toEqual([]);
    expect(skillsUsedInFrame("not a frame")).toEqual([]);
    expect(skillsUsedInFrame({ type: "assistant", message: { content: [{ type: "tool_use", name: "Skill", input: {} }] } })).toEqual([]);
  });
});

describe("inventorySkills", () => {
  it("walks .claude/skills/*/SKILL.md into a sorted registry", async () => {
    const root = await mkdtemp(join(tmpdir(), "atlas-skills-"));
    await mkdir(join(root, ".claude", "skills", "triage"), { recursive: true });
    await mkdir(join(root, ".claude", "skills", "grill"), { recursive: true });
    await mkdir(join(root, ".claude", "skills", "empty-dir"), { recursive: true }); // no SKILL.md → skipped
    await writeFile(join(root, ".claude", "skills", "triage", "SKILL.md"), `---\nname: triage\ndescription: Sort the deck\n---\n`);
    await writeFile(join(root, ".claude", "skills", "grill", "SKILL.md"), `---\ndescription: Interview\n---\n`); // no name → dir name

    const skills = await inventorySkills(root);
    expect(skills.map((s) => s.name)).toEqual(["grill", "triage"]); // sorted, empty-dir skipped
    expect(skills.find((s) => s.name === "triage")?.description).toBe("Sort the deck");
  });

  it("returns [] for a project with no .claude/skills", async () => {
    const root = await mkdtemp(join(tmpdir(), "atlas-noskills-"));
    expect(await inventorySkills(root)).toEqual([]);
  });
});

describe("constitutionHash", () => {
  it("is empty for a project with no constitution, stable when unchanged, and changes on edit", async () => {
    const root = await mkdtemp(join(tmpdir(), "atlas-consth-"));
    expect(await constitutionHash(root)).toBe(""); // no CLAUDE.md / skills

    await writeFile(join(root, "CLAUDE.md"), "# Guide\nDo the thing.");
    const h1 = await constitutionHash(root);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(await constitutionHash(root)).toBe(h1); // stable

    await mkdir(join(root, ".claude", "skills", "grill"), { recursive: true });
    await writeFile(join(root, ".claude", "skills", "grill", "SKILL.md"), "---\nname: grill\n---\n");
    const h2 = await constitutionHash(root);
    expect(h2).not.toBe(h1); // adding a skill changes the hash

    await writeFile(join(root, "CLAUDE.md"), "# Guide\nDo the OTHER thing.");
    expect(await constitutionHash(root)).not.toBe(h2); // editing CLAUDE.md changes it
  });
});
