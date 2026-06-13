/**
 * BPI — Serves install.ps1 with the Atlas origin and GitHub repo slug
 * interpolated in at request time.
 *
 * PUBLIC — no auth. The script contains no secrets; the only sensitive step
 * is the interactive `atlas-bridge pair` at the end, which opens a browser
 * and requires the user to approve from the Atlas UI.
 *
 * ENV vars consumed:
 *   ATLAS_APP_URL       — the public Atlas URL (falls back to request origin)
 *   ATLAS_GITHUB_REPO   — the GitHub repo slug (falls back to "your-org/atlas-v2")
 *
 * Served at: GET /install.ps1
 * Install one-liner:
 *   irm https://<your-atlas>/install.ps1 | iex
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Pure interpolation helper — exported so tests can exercise it without
 *  touching the filesystem or Next.js request machinery. */
export function interpolateScript(
  raw: string,
  origin: string,
  githubRepo: string,
): string {
  return raw.replaceAll("ATLAS_ORIGIN", origin).replaceAll("GITHUB_REPO_SLUG", githubRepo);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = process.env.ATLAS_APP_URL ?? request.nextUrl.origin;
  const githubRepo = process.env.ATLAS_GITHUB_REPO ?? "your-org/atlas-v2";

  const scriptPath = join(process.cwd(), "scripts/install/install.ps1");
  const raw = readFileSync(scriptPath, "utf-8");
  const script = interpolateScript(raw, origin, githubRepo);

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
