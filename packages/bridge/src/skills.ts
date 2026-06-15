/**
 * Skills layer (ADR-0008 §3) — the bridge's view of a project's capabilities.
 *
 * Two pure cores + one fs reader, all local to the worktree the daemon already
 * owns:
 *   - parseSkillFrontmatter — SKILL.md YAML-ish frontmatter → {name, description,
 *     invocability}. Minimal line parser; no YAML dependency.
 *   - skillsUsedInFrame — given ONE parsed engine stream frame, the skill names the
 *     model invoked. Skills surface as a `tool_use` block (name "Skill",
 *     input.skill) inside an `assistant` frame — empirically locked against
 *     claude 2.1.177 (notes/skill-stream-capture). This is the observability seam.
 *   - inventorySkills — walk `<root>/.claude/skills/<name>/SKILL.md` into a registry.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export type SkillInfo = {
  /** the skill's invocation name (frontmatter `name`, else the directory name). */
  name: string;
  description?: string;
  /** false when frontmatter sets `disable-model-invocation: true`. */
  modelInvocable: boolean;
  /** false when frontmatter sets `user-invocable: false`. */
  userInvocable: boolean;
};

/** parse the leading `--- ... ---` frontmatter of a SKILL.md (minimal, no YAML dep). */
export function parseSkillFrontmatter(md: string): {
  name?: string;
  description?: string;
  modelInvocable: boolean;
  userInvocable: boolean;
} {
  const out = { modelInvocable: true, userInvocable: true } as {
    name?: string;
    description?: string;
    modelInvocable: boolean;
    userInvocable: boolean;
  };
  const m = md.match(/^\s*---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return out;
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.trim();
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    let val = line.slice(colon + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key === "name" && val) out.name = val;
    else if (key === "description" && val) out.description = val;
    else if (key === "disable-model-invocation") out.modelInvocable = val !== "true";
    else if (key === "user-invocable") out.userInvocable = val !== "false";
  }
  return out;
}

/**
 * The skill names invoked in one parsed engine stream frame. Skills appear as a
 * `tool_use` content block (name "Skill", input.skill) on an `assistant` frame.
 * Pure + defensive: any shape that isn't that yields []. (ADR-0008 §3.)
 */
export function skillsUsedInFrame(frame: unknown): string[] {
  if (!isRecord(frame) || frame.type !== "assistant") return [];
  const message = frame.message;
  if (!isRecord(message)) return [];
  const content = message.content;
  if (!Array.isArray(content)) return [];
  const names: string[] = [];
  for (const block of content) {
    if (
      isRecord(block) &&
      block.type === "tool_use" &&
      block.name === "Skill" &&
      isRecord(block.input) &&
      typeof block.input.skill === "string" &&
      block.input.skill
    ) {
      names.push(block.input.skill);
    }
  }
  return names;
}

/** read `<root>/.claude/skills/<name>/SKILL.md` into a registry (project skills only). */
export async function inventorySkills(root: string): Promise<SkillInfo[]> {
  const skillsDir = join(root, ".claude", "skills");
  let entries: string[];
  try {
    entries = (await readdir(skillsDir, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return []; // no .claude/skills — a project with no skills is honest, not an error
  }
  const out: SkillInfo[] = [];
  for (const dir of entries) {
    let md: string;
    try {
      md = await readFile(join(skillsDir, dir, "SKILL.md"), "utf8");
    } catch {
      continue; // a skill dir without a SKILL.md isn't a skill
    }
    const fm = parseSkillFrontmatter(md);
    out.push({
      name: fm.name ?? dir,
      ...(fm.description ? { description: fm.description } : {}),
      modelInvocable: fm.modelInvocable,
      userInvocable: fm.userInvocable,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
