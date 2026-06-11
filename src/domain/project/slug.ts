/**
 * M7 — Project identity: slug derivation + repo-source classification +
 * new-project validation (pure; charter §2).
 *
 * R's intake form (R:94–114) takes ONE field — where the code lives.
 * A URL becomes `repo_url`; a filesystem path becomes `local_path`
 * (the Bridge's territory at M9/M10, but the Owner can register it
 * now). The display name and the route slug both derive from the
 * source's last path segment.
 *
 * Validation renders per canon §2.13 — one quiet mono line per field,
 * sentence case, no exclamation marks.
 */

/** route key — lowercase, [a-z0-9-], no leading/trailing/double dashes. */
export function deriveSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type RepoSource =
  | { kind: "url"; repoUrl: string; name: string }
  | { kind: "path"; localPath: string; name: string };

/** windows (C:\…) or POSIX (/… , ~/…) or relative-ish (./…) path shapes. */
const PATH_SHAPE = /^([a-zA-Z]:[\\/]|\\\\|\/|~\/|\.{1,2}[\\/])/;

/**
 * Classify the single R-form input: https/ssh URL → repo_url,
 * filesystem path → local_path; null when it's neither.
 */
export function classifyRepoSource(raw: string): RepoSource | null {
  const input = raw.trim();
  if (input.length === 0) return null;

  if (PATH_SHAPE.test(input)) {
    const segments = input.split(/[\\/]+/).filter(Boolean);
    const last = segments[segments.length - 1];
    const name = last && !/^[a-zA-Z]:$/.test(last) ? last : null;
    if (!name || deriveSlug(name).length === 0) return null;
    return { kind: "path", localPath: input, name };
  }

  // git ssh form — git@github.com:org/repo.git
  const ssh = input.match(/^git@[\w.-]+:(?:[\w./-]*\/)?([\w.-]+?)(?:\.git)?$/);
  if (ssh) {
    return { kind: "url", repoUrl: input, name: ssh[1] };
  }

  try {
    const url = new URL(input);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const segments = url.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1]?.replace(/\.git$/, "");
    if (!last || deriveSlug(last).length === 0) return null;
    return { kind: "url", repoUrl: input, name: last };
  } catch {
    return null;
  }
}

export type NewProjectInput = {
  source: string;
};

export type ValidatedNewProject = {
  name: string;
  slug: string;
  repoUrl: string | null;
  localPath: string | null;
};

export type NewProjectValidation =
  | { ok: true; value: ValidatedNewProject }
  | { ok: false; error: string };

/** §2.13 messages — sentence case, no `!`. */
export function validateNewProject(input: NewProjectInput): NewProjectValidation {
  const source = input.source.trim();
  if (source.length === 0) {
    return { ok: false, error: "paste a repository url or a path on your machine" };
  }
  const classified = classifyRepoSource(source);
  if (!classified) {
    return {
      ok: false,
      error: "that doesn't look like a repository url or a filesystem path",
    };
  }
  const slug = deriveSlug(classified.name);
  return {
    ok: true,
    value: {
      name: classified.name,
      slug,
      repoUrl: classified.kind === "url" ? classified.repoUrl : null,
      localPath: classified.kind === "path" ? classified.localPath : null,
    },
  };
}
