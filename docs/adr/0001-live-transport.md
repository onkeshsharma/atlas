# ADR 0001 — Live transport: SSE over the feed-outbox cursor (polled), pg_notify deferred

- **Status:** accepted (M6, 2026-06-11)
- **Owners:** M6 SHELL+TODAY+INBOX; M9 inherits the seam
- **Code:** `src/domain/live/` (vocabulary + broker) · `app/api/live/route.ts` (transport) ·
  `src/components/live/LiveRefresh.tsx` (browser side) · `src/domain/run/transitions.ts` (outbox writer)

## Context

PRD locks a typed **Live protocol** as a deep module: run events + stdout up, cancel/answer
down, "transport mechanism … hidden behind this interface". M6 must prove the seam
browser-deep (a DB change appears in an open tab without refresh); M9 later plugs
Bridge-originated events into the same vocabulary.

Constraints that matter:

1. **The db client is neon-http** (`src/db/client.ts`) — stateless SQL-over-HTTP, no
   long-lived connection, no LISTEN. Postgres LISTEN/NOTIFY would require a second client
   (`@neondatabase/serverless` WebSocket Pool or `pg` over TCP).
2. **v1 prior art** (read 2026-06-11, rewritten — never copied): `atlas/src/lib/event-bus.ts`
   (T41 generic broker, extracted from T27's `bridge-events.ts`), `atlas/src/lib/user-events.ts`
   (typed event union + SSE frame formatters), `atlas/app/api/events/user/route.ts` (SSE
   endpoint). Hard-won lessons recorded there:
   - pgbouncer/pooled connections **silently drop** LISTEN/NOTIFY in transaction mode; v1
     needed a dedicated `listenClient` on the direct endpoint.
   - NOTIFY is **at-most-once**: events fired while a subscriber reconnects are gone, so v1
     grew catch-up logic anyway (`dispatchPendingJobsToBridge`).
3. **Vercel serverless**: any push transport means one long-lived function invocation per
   open tab. That cost is identical whether the function idles on LISTEN or polls; the
   difference is an extra DB connection slot per tab (LISTEN) vs ~0.5 cheap queries/second
   (poll).

## Decision

**The typed vocabulary is the contract; the transport is SSE backed by a polled
transactional outbox.**

- `feed_events.id` (bigserial) is a **monotonic cursor**. Run transitions write their feed
  row *in the same SQL statement* that flips the run (`applyRunTransition` — neon-http has
  no interactive transactions, so atomicity comes from a single `UPDATE … RETURNING` CTE
  feeding an `INSERT`). The outbox therefore cannot disagree with state.
- `GET /api/live?since=<cursor>` streams SSE. The route polls
  `pollLiveEvents(since)` every 2 s and emits typed frames
  (`feed-appended`, `run-state-changed`, `needs-input-raised`, `needs-input-answered`);
  every frame carries `id: <cursor>`, so EventSource reconnects resume from
  `Last-Event-ID` and **delivery is at-least-once with zero catch-up machinery** — the
  thing v1's NOTIFY design had to bolt on.
- Browser side: `LiveRefresh` opens the EventSource and calls `router.refresh()`
  (throttled) on any event — server components re-render with fresh rows. Pages stay
  server-rendered; no client data stores.
- The **command channel** (`cancel-run`, `answer-run`) is vocabulary-only in M6
  (`src/domain/live/commands.ts`); M9 implements executors (browser → Atlas → Bridge).

## Why not pg_notify + LISTEN now

- Needs a second, stateful DB client beside neon-http, on the **direct** (non-pooled)
  endpoint — one connection per open tab, plus the pgbouncer foot-gun above.
- At-most-once delivery still demands a cursor/catch-up path for correctness, i.e. the
  outbox gets built anyway; NOTIFY would only shave the ≤2 s poll latency.
- The cockpit's freshness budget is human-scale (a pulse dot flipping within ~2 s reads
  as instant); stdout streaming — the one latency-sensitive flow — is M9's, and M9 gets a
  better source than Postgres for it (the Bridge itself).

## Consequences / revisit triggers

- Honest costs: ~1 outbox query per 2 s per open tab; one function invocation held open
  per tab (Vercel `maxDuration` will cut streams — EventSource auto-reconnects with
  `Last-Event-ID`, losing nothing).
- M9 **must** keep writing run mutations through `applyRunTransition` (or another
  single-statement outbox writer) — bypassing the outbox silently breaks liveness.
- Revisit (new ADR) when: stdout streaming needs sub-second latency end-to-end; open-tab
  count makes polling measurably expensive; or the Bridge uplink wants a true push bus.
  The swap is contained: reimplement `broker.ts`/`route.ts`, keep `events.ts` intact.
