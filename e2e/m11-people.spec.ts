// M11 — the People loop, end to end (charter done criterion 1):
// invite-with-note → show-once magic link → accept (note + real project
// section) → instance membership + project roster → visible on the
// members page, the trust circle, and the project landing rail →
// remove / re-add project access → instance revoke → the audit log
// shows every step, searches and filters it, and gains rows LIVE.
// Self-cleaning via the "e2e-m11p" / "E2E M11P" markers.
import { expect, test } from "@playwright/test";

import { signInAsOwner } from "./support/sign-in";
import { and, eq, inArray, like, or, sql } from "drizzle-orm";

import { db } from "../src/db/client";
import {
  feedEvents,
  invites,
  memberships,
  projectMembers,
  projects,
  userPreferences,
} from "../src/db/schema";

const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const RUN = Date.now();
const OWNER_EMAIL = `e2e-m11p-owner-${RUN}@example.com`;
const COLLAB_EMAIL = `e2e-m11p-ada-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";
const WELCOME_NOTE = `Welcome to acme-website. You'll be filing bugs on the new checkout flow. (${RUN})`;

let magicLink = "";
let collabUserId = "";
let acmeId = "";

async function cleanupRows() {
  const mine = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E M11P %"));
  const userIds = mine.map((m) => m.userId);
  await db
    .delete(feedEvents)
    .where(
      or(
        like(feedEvents.summary, "%e2e-m11p%"),
        like(feedEvents.summary, "%E2E M11P%"),
        like(feedEvents.actor, "E2E M11P%"),
        userIds.length
          ? inArray(sql`${feedEvents.payload}->>'userId'`, userIds)
          : sql`false`,
      ),
    );
  if (userIds.length) {
    await db.delete(projectMembers).where(inArray(projectMembers.userId, userIds));
    await db.delete(userPreferences).where(inArray(userPreferences.userId, userIds));
  }
  await db.delete(invites).where(like(invites.email, "e2e-m11p-%"));
  await db.delete(memberships).where(like(memberships.displayName, "E2E M11P %"));
}

test.beforeAll(async () => {
  await cleanupRows();
  const [acme] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, "acme-website"));
  acmeId = acme.id;
});

test.afterAll(async () => {
  await cleanupRows();
});

test.describe.serial("M11 — the People loop is real", () => {
  test("owner bootstrap + the members page reads the real roster", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M11P Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });

    await page.goto("/projects/acme-website/members");
    await expect(page.getByRole("heading", { name: "Members." })).toBeVisible();
    // the Owner row composes from the instance membership (two-table rule)
    const ownerRow = page.locator("li", { hasText: "You" }).first();
    await expect(ownerRow.getByText("owner", { exact: true })).toBeVisible();
    await expect(ownerRow.getByText(OWNER_EMAIL)).toBeVisible();
    // an Owner row never offers remove (M:187's spacer)
    await expect(ownerRow.getByRole("button", { name: "remove →" })).toHaveCount(0);
  });

  test("invite with a welcome note → the magic link shows once → pending row", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signInAsOwner(page, OWNER_EMAIL, PASSWORD);
    await page.goto("/projects/acme-website/members");

    await page.getByPlaceholder("name@example.com").fill(COLLAB_EMAIL);
    await page
      .getByPlaceholder("A quick line so they know what they're being invited to.")
      .fill(WELCOME_NOTE);
    await page.getByRole("button", { name: /create invite/i }).click();

    // the honest "send": a REAL magic link, shown once (M5 deviation 1)
    await expect(page.getByText("Invite created · share the link")).toBeVisible({
      timeout: 30_000,
    });
    magicLink = (await page.locator(".select-all").first().textContent())!.trim();
    expect(magicLink).toMatch(/\/invite\/inv_/);

    // the pending row carries the note + revoke/copy affordances
    const pendingRow = page.locator("li", { hasText: COLLAB_EMAIL });
    await expect(pendingRow.getByText(`“${WELCOME_NOTE}”`)).toBeVisible();
    await expect(pendingRow.getByText("invited by you", { exact: false })).toBeVisible();

    // the `invited` outbox row landed with the insert (THE OUTBOX RULE)
    const feed = await db
      .select()
      .from(feedEvents)
      .where(and(eq(feedEvents.kind, "invited"), like(feedEvents.summary, `%${COLLAB_EMAIL}%`)));
    expect(feed).toHaveLength(1);
    expect(feed[0].preview).toBe(WELCOME_NOTE);
  });

  test("the magic link: note + REAL project section → account → roster row", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    // the invitee is a different person — fresh cookies
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const path = magicLink.replace(/^https?:\/\/[^/]+/, "");
    await page.goto(path);

    // U:55 welcome-note pull-quote + U:71's restored About-this-Project
    await expect(page.getByText(WELCOME_NOTE)).toBeVisible();
    await expect(page.getByText("About this Project")).toBeVisible();
    await expect(page.getByText("acme-website", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /accept invite/i }).click();
    await expect(page).toHaveURL(/\/sign-up\?invite=/);
    await expect(page.getByText(`✓ invite for ${COLLAB_EMAIL}`)).toBeVisible();
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M11P Ada");
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 30_000 });
    await ctx.close();

    // acceptance landed BOTH grants: instance membership + project roster
    const [member] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.displayName, "E2E M11P Ada"));
    expect(member.role).toBe("collaborator");
    collabUserId = member.userId;
    const roster = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.userId, collabUserId), eq(projectMembers.projectId, acmeId)));
    expect(roster).toHaveLength(1);
  });

  test("visible on M + WW + the landing rail (the trust circle is real)", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signInAsOwner(page, OWNER_EMAIL, PASSWORD);

    // members page: the Collaborator is on the roster, removable
    await page.goto("/projects/acme-website/members");
    const adaRow = page.locator("li", { hasText: "E2E M11P Ada" }).first();
    await expect(adaRow).toBeVisible();

    // trust circle: the person, their grant chip, the revoke affordance
    await page.goto("/settings/people");
    const circleRow = page.locator("li", { hasText: "E2E M11P Ada" });
    await expect(circleRow.getByText("acme-website")).toBeVisible();
    await expect(circleRow.getByRole("button", { name: "revoke access" })).toBeVisible();

    // project landing rail: real roster + the restored manage link
    await page.goto("/projects/acme-website");
    await expect(page.getByText("1 owner · 1 collaborator", { exact: false })).toBeVisible();
    await page.getByRole("link", { name: "manage members →" }).click();
    await expect(page).toHaveURL(/\/projects\/acme-website\/members/);
  });

  test("the audit log shows every step; search + kind filters are real", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signInAsOwner(page, OWNER_EMAIL, PASSWORD);
    await page.goto("/settings/audit");

    // the steps so far, on the record
    await expect(page.getByText(`Invited ${COLLAB_EMAIL} — acme-website`)).toBeVisible();
    await expect(
      page.getByText(/Joined the circle as the \d+\w+ Collaborator · acme-website/),
    ).toBeVisible();
    await expect(page.getByText("SIGN IN").first()).toBeVisible();

    // search is real (?q=) — every term must hit
    await page
      .locator('input[name="q"]')
      .fill(COLLAB_EMAIL.slice(0, COLLAB_EMAIL.indexOf("@")));
    await page.locator('input[name="q"]').press("Enter");
    await expect(page).toHaveURL(/q=e2e-m11p-ada/);
    await expect(page.getByText(`Invited ${COLLAB_EMAIL} — acme-website`)).toBeVisible();
    // a seeded row that doesn't match the query is filtered out
    await expect(page.getByText("Shipped T-249", { exact: false })).toHaveCount(0);

    // kind chips are real (?kind=) — security keeps invites, drops tickets
    await page.goto("/settings/audit?kind=security");
    await expect(page.getByText(`Invited ${COLLAB_EMAIL} — acme-website`)).toBeVisible();
    await expect(page.getByText("Filed T-310", { exact: false })).toHaveCount(0);
  });

  test("remove from the project + the re-add path (both writers, live rows)", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signInAsOwner(page, OWNER_EMAIL, PASSWORD);
    await page.goto("/projects/acme-website/members");

    // hover-revealed remove (M:184)
    const adaRow = page.locator("li", { hasText: "E2E M11P Ada" }).first();
    await adaRow.hover();
    await adaRow.getByRole("button", { name: "remove →" }).click();

    // the person leaves the roster but stays in the circle (two-table rule)
    const offRosterSection = page.locator("section", {
      hasText: "In your circle, not on this project",
    });
    await expect(
      offRosterSection.getByRole("button", { name: "add to this project →" }),
    ).toBeVisible({ timeout: 30_000 });
    expect(
      await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.userId, collabUserId), eq(projectMembers.projectId, acmeId))),
    ).toHaveLength(0);

    // the danger filter catches the removal (TT:144's family, real)
    await page.goto("/settings/audit?kind=danger");
    await expect(page.getByText("Removed E2E M11P Ada from acme-website")).toBeVisible();

    // the re-add path — roster grants are not one-shot like invites
    await page.goto("/projects/acme-website/members");
    await page.getByRole("button", { name: "add to this project →" }).click();
    // back on the Roster list (her `joined` row keeps her "active today")
    const rosterSection = page.locator("section", { hasText: "Roster" }).first();
    await expect(
      rosterSection.locator("li", { hasText: "E2E M11P Ada" }),
    ).toBeVisible({ timeout: 30_000 });
    expect(
      await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.userId, collabUserId), eq(projectMembers.projectId, acmeId))),
    ).toHaveLength(1);
  });

  test("audit rows appear LIVE — no reload (ADR-0001 seam)", async ({ page }) => {
    test.setTimeout(120_000);
    await signInAsOwner(page, OWNER_EMAIL, PASSWORD);
    await page.goto("/settings/audit");
    await expect(page.getByRole("heading", { name: /paper trail/ })).toBeVisible();

    const marker = `E2E M11P live probe ${RUN}`;
    await db.insert(feedEvents).values({
      kind: "filed",
      actor: "E2E M11P Owner",
      summary: marker,
      seeded: false,
    });
    // LiveRefresh hears the outbox cursor move and re-renders the record
    await expect(page.getByText(`Filed ${marker}`)).toBeVisible({ timeout: 30_000 });
  });

  test("instance revoke: the person leaves the circle; the record keeps them", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signInAsOwner(page, OWNER_EMAIL, PASSWORD);
    await page.goto("/settings/people");

    const circleRow = page.locator("li", { hasText: "E2E M11P Ada" });
    await circleRow.getByRole("button", { name: "revoke access" }).click();
    await expect(circleRow).toHaveCount(0, { timeout: 30_000 });

    // membership AND roster rows are gone — one statement, one feed row
    expect(
      await db.select().from(memberships).where(eq(memberships.userId, collabUserId)),
    ).toHaveLength(0);
    expect(
      await db.select().from(projectMembers).where(eq(projectMembers.userId, collabUserId)),
    ).toHaveLength(0);

    // the audit shows the instance-scope removal; history is intact
    await page.goto("/settings/audit?kind=danger");
    await expect(page.getByText("Removed E2E M11P Ada from this Atlas")).toBeVisible();
    await page.goto("/settings/audit");
    await expect(page.getByText(`Invited ${COLLAB_EMAIL} — acme-website`)).toBeVisible();
  });
});
