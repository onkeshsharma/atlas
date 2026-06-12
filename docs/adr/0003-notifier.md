# ADR-0003 — The Notifier: outbox-anchored composition, cron-edged delivery

> M13, 2026-06-12. Status: accepted. Sibling to ADR-0001 (the feed
> outbox is the live cursor) and ADR-0002 (catch-up is DB state).

## Context

PRD #28/#44/#45 promise the reporting Collaborator a ship email and
every Collaborator a weekly digest, honoring the notification
preferences M10 stored (frequency, per-event switches, quiet hours +
timezone, email format). Atlas runs serverless (no resident process
besides the Owner's Bridge daemon), suites must never send real email,
and delivery must degrade honestly when no RESEND_API_KEY exists.

## Decision

1. **The notification outbox is the unit of truth** (migration 0009).
   Every composed notification lands as a durable row — subject,
   rendered html + text, status (`composed | sent | skipped-quiet-hours
   | skipped-pref | failed`), provider id. The row is the audit AND the
   no-key fallback; suites assert against rows, never against delivery.
2. **Ship trigger = the `shipped` feed row.** THE OUTBOX RULE means the
   row can never be missing when a ship happened, so the Notifier
   consumes the same seam everything else trusts. Two kick sites, one
   idempotent function (`notifyShipForFeedEvent`):
   - in-path: the Bridge transition route composes right after
     `shipRun` lands (the common case — zero added latency for the
     daemon, one extra await for the request).
   - catch-up: the cron pass anti-joins recent `shipped` rows against
     the outbox and composes the misses (a kick lost to a redeploy
     heals on the next pass). No cursor row is kept: idempotency is
     STRUCTURAL — partial unique indexes on (recipient, kind,
     feed_event_id) and (recipient, kind, period_key) make redelivery
     compose nothing twice (the ADR-0002 catch-up idiom, anti-join
     form).
3. **Digest = cron-composed, Monday 09:00 recipient-local,** over the
   last full UTC week (period key = ISO week). `?force=digest` digests
   the trailing 7 days under a `-forced` key — the Owner-triggered
   "send now" / acceptance affordance, still idempotent. Quiet weeks
   (nothing shipped, filed, or in review) compose nothing.
4. **Delivery is a separate pass** (`deliverDue`): rows whose
   deliver_after has passed send via Resend when a key exists; quiet
   hours are re-checked at send time and re-defer to the window edge.
   Frequency mapping (recorded in gate.ts): instant sends now; daily
   holds ships to 09:00 local; weekly folds ships into the digest
   (skipped-pref rows keep the audit); off sends nothing.
5. **Scheduling:** vercel.json crons the pass hourly at
   `/api/notifier/cron`, authed by `CRON_SECRET` (Vercel's header
   convention). Hourly granularity bounds quiet-hours/daily edges to
   ≤59 minutes of drift — accepted for a comfort feature.

## Alternatives rejected

- **A resident feed consumer with its own cursor** (the daemon's
  events-route idiom): nothing server-side is resident; a cursor row
  adds bookkeeping the unique indexes already provide.
- **Composing at read time** (render the email when the cron sends):
  the outbox would no longer be the audit — a pref flipped between
  event and send would silently rewrite history.
- **Per-project digest opt-out** (YY's colophon mentions it): the
  prefs schema is per-user (M10); per-project granularity is a future
  column, not a v2.0 promise.

## Consequences

- Ship emails compose within the ship request; digests and deferred
  sends move at cron cadence (≤1h lag).
- The outbox table grows with real activity only (skipped-pref rows
  are written for the reporter's decisions and weekly digest
  decisions; default-off project-wide audiences write nothing).
- DST inside a quiet window shifts the computed edge by the offset
  delta (wall-clock arithmetic) — accepted, recorded in gate.ts.
