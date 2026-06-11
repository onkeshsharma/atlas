// M11 — convergence captures (master plan §5.5–5.6): the three People
// surfaces at 1920/1440/1280 beside their /dev-variants renders, into
// notes/m11-captures/. Fixture people (3 circle members, 2 rostered on
// acme-website, 1 pending invite with a note, presence feed rows) make
// the renders comparable to the variants' mock density; the show-once
// invite panel is captured live mid-spec. Self-cleaning ("e2e-m11c").
//
// Fixture emails render as "—": memberships join neon_auth."user" for
// emails and that schema is the hosted auth server's — never written to
// (M5 law). A data difference, not drift; noted in M11-manual-test.md.
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { signInAsOwner } from "./support/sign-in";
import { eq, inArray, like, or, sql } from "drizzle-orm";

import { db } from "../src/db/client";
import {
  feedEvents,
  invites,
  memberships,
  projectMembers,
  projects,
  userPreferences,
} from "../src/db/schema";
import { issueInvite } from "../src/domain/auth/invites";

const CAPTURE_DIR = join(__dirname, "..", "..", "notes", "m11-captures");
const RUN = Date.now();
const OWNER_EMAIL = `e2e-m11c-owner-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";
const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;

const PEOPLE = [
  { userId: `e2e-m11c-ada-${RUN}`, displayName: "E2E M11C Ada", handle: "ada", initial: "a" },
  { userId: `e2e-m11c-carmen-${RUN}`, displayName: "E2E M11C Carmen", handle: "carmen", initial: "c" },
  { userId: `e2e-m11c-max-${RUN}`, displayName: "E2E M11C Max", handle: "max", initial: "m" },
];

const VIEWPORTS = [
  { w: 1920, h: 1080 },
  { w: 1440, h: 900 },
  { w: 1280, h: 800 },
];

async function captureAcrossViewports(page: Page, slug: string) {
  await page.mouse.move(0, 0);
  await page.addStyleTag({
    content: "*, *::before, *::after { animation: none !important; }",
  });
  for (const { w, h } of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h });
    await page.screenshot({ path: join(CAPTURE_DIR, `${slug}-${w}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function cleanupRows() {
  const userIds = PEOPLE.map((p) => p.userId);
  await db
    .delete(feedEvents)
    .where(
      or(
        like(feedEvents.summary, "%e2e-m11c%"),
        like(feedEvents.summary, "%E2E M11C%"),
        like(feedEvents.actor, "E2E M11C%"),
        inArray(sql`${feedEvents.payload}->>'userId'`, userIds),
      ),
    );
  await db.delete(projectMembers).where(like(projectMembers.userId, "e2e-m11c-%"));
  await db.delete(invites).where(like(invites.email, "e2e-m11c-%"));
  const owners = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E M11C %"));
  for (const o of owners) {
    await db.delete(userPreferences).where(eq(userPreferences.userId, o.userId));
  }
  await db.delete(memberships).where(like(memberships.displayName, "E2E M11C %"));
}

test.beforeAll(async () => {
  mkdirSync(CAPTURE_DIR, { recursive: true });
  await cleanupRows();

  const [acme] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, "acme-website"));

  // three circle members; two rostered on acme-website
  await db.insert(memberships).values(
    PEOPLE.map((p) => ({
      userId: p.userId,
      role: "collaborator" as const,
      displayName: p.displayName,
      handle: p.handle,
      initial: p.initial,
      createdAt: new Date(Date.now() - 71 * 86_400_000),
    })),
  );
  await db.insert(projectMembers).values([
    { projectId: acme.id, userId: PEOPLE[0].userId, addedBy: "e2e-m11c-owner" },
    { projectId: acme.id, userId: PEOPLE[1].userId, addedBy: "e2e-m11c-owner" },
  ]);
  // presence: Ada active today (the per-person derivation reads actors)
  await db.insert(feedEvents).values({
    kind: "replied",
    actor: "E2E M11C Ada",
    summary: "T-302 — Onboarding screenshots are stale",
    projectId: acme.id,
    seeded: false,
  });
  // a pending invite with a note (M's Pending section + WW's amber rows)
  await issueInvite({
    email: `e2e-m11c-dev-${RUN}@example.com`,
    invitedBy: "e2e-m11c-owner",
    welcomeNote: "Welcome to acme-website. You'll be filing bugs on the new checkout flow.",
    projectId: acme.id,
    actor: "you",
  });
});

test.afterAll(async () => {
  await cleanupRows();
});

test.describe.serial("M11 — capture rig", () => {
  test("owner bootstrap", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M11C Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });
  });

  test("capture the three surfaces at 1920/1440/1280 (+ show-once panel)", async ({
    page,
  }) => {
    test.setTimeout(600_000);
    await signInAsOwner(page, OWNER_EMAIL, PASSWORD);

    const surfaces: Array<[string, string]> = [
      ["members", "/projects/acme-website/members"],
      ["people", "/settings/people"],
      ["audit", "/settings/audit"],
    ];
    for (const [slug, path] of surfaces) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      await captureAcrossViewports(page, slug);
    }

    // the members centrepiece: a REAL show-once magic-link panel
    await page.goto("/projects/acme-website/members", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("name@example.com").fill(`e2e-m11c-panel-${RUN}@example.com`);
    await page.getByRole("button", { name: /create invite/i }).click();
    await expect(page.getByText("Invite created · share the link")).toBeVisible({
      timeout: 30_000,
    });
    await page.mouse.move(0, 0);
    await page.addStyleTag({
      content: "*, *::before, *::after { animation: none !important; }",
    });
    const panel = page.locator("section", { hasText: "Invite created · share the link" }).last();
    await panel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(CAPTURE_DIR, "members-show-once-1440.png") });

    // variant references at the canonical width
    for (const key of ["m", "ww", "tt"]) {
      await page.goto(`/dev-variants/${key}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      await page.mouse.move(0, 0);
      await page.addStyleTag({
        content: "*, *::before, *::after { animation: none !important; }",
      });
      await page.screenshot({
        path: join(CAPTURE_DIR, `variant-${key}-1440.png`),
        fullPage: true,
      });
    }
  });
});
