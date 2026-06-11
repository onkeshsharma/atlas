/**
 * M10 — shared owner sign-in with retry discipline. HANDOFF-M9's flake
 * watch item said: "if it recurs, the sign-in helper deserves the same
 * retry discipline as the triage keypress fix." It recurred (2026-06-12,
 * m6's helper under full-suite load — the page sat on /sign-in for 30 s
 * with no error). Two known exposures: hosted-auth latency above the
 * wait under dev-server load, and a click landing before hydration so
 * the form never submits. One full re-goto + re-submit retry covers
 * both; a second failure is real and throws.
 */
import { expect, type Page } from "@playwright/test";

export async function signInAsOwner(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    await page.goto("/sign-in");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("••••••••").fill(password);
    await page.getByRole("button", { name: /^sign in/i }).click();
    try {
      await expect(page).toHaveURL(/\/today/, { timeout: 30_000 });
      return;
    } catch (err) {
      if (attempt >= 1) throw err;
    }
  }
}
