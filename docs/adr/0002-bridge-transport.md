# ADR 0002 — Bridge↔Atlas transport: one outbox both ways, stdout on its own cursor

- **Status:** accepted (M9 Session A, 2026-06-11)
- **Owners:** M9 ENGINE & RUNS; M10 inherits the token/pairing story
- **Code:** `src/domain/bridge/` (token auth + event mapping) ·
  `app/api/bridge/*` (uplink + command stream) · `app/api/runs/[id]/stdout`
  (browser stdout) · `packages/bridge/` (the daemon) ·
  `src/domain/run/bridge-writers.ts` (single-statement claim/complete/fail)
- **Builds on:** ADR-0001 (SSE over the polled feed-outbox cursor; intake
  ADR-0001 cloud-Atlas + Bridge-as-orchestrator)

## Context

The Bridge becomes the local orchestrator (N Engine sessions, worktree-per-Run,
PRD #19–23, #35). Three flows need a transport:

1. **Down** (Atlas → Bridge): run-available, cancel, answer — the steering
   commands (`src/domain/live/commands.ts` fixed the vocabulary in M6).
2. **Up** (Bridge → Atlas): run state transitions, stdout, helper-run
   deliverables, heartbeat.
3. **Browser stdout** (Atlas → browser): the live terminal pane (PRD #5).

Constraints: the daemon sits behind NAT on the Owner's PC (it must dial out;
Atlas can never dial in). neon-http has no transactions — every mutation is a
single-statement conditional write + outbox row (M6 law). Runs must queue
while the Bridge is down and dispatch on reconnect (PRD #35). v1 prior art
(read 2026-06-11, rewritten, never copied): `atlas/packages/atlas-bridge/src/lib/`
sse-client.ts (backoff SSE consumer), heartbeat.ts, stdout-uploader.ts +
stdout-tick.ts (rolling-tail POSTs), event-router.ts (typed event dispatch),
engine-spawner.ts, git-ops.ts, single-instance.ts (TCP-port lock),
failure-codes.ts (hand-mirrored type vocabulary across packages).

## Decision

### 1. Auth: bearer token, hashed at rest

The daemon holds `ATLAS_BRIDGE_TOKEN` (env); every request carries
`Authorization: Bearer <token>`. Atlas stores **only the sha-256 hex** in
`bridges.token_hash` and resolves the row per request. Pairing in M9 is
`scripts/pair-bridge.mjs` (prints the token once); the XX show-once panel and
rotate/revoke are M10's (PRD #36). A 401 stops the daemon (v1 rule — a revoked
token must not retry forever).

### 2. Down-channel: the SAME feed outbox, re-read as commands

The charter default ("Bridge subscribes to Atlas over HTTPS") is kept, with one
sharpening: **no second event store.** Every command the Bridge needs is already
an outbox row, because every mutation that *creates* a command writes
`feed_events` in the same statement (dispatch → `dispatched`, cancel →
`cancelled`, answer → `answered`). So:

- `GET /api/bridge/events` (token-authed SSE) polls `feed_events` past the
  cursor — exactly ADR-0001's transport — and maps rows to the Bridge command
  vocabulary: `dispatched` → `run-available`, `cancelled` → `run-cancelled`,
  `answered` → `run-answered` (answer payload rides the row's payload jsonb).
  Frames carry `id: <cursor>`; the daemon's SSE consumer (v1 sse-client
  pattern: fetch + backoff) resumes via `Last-Event-ID`.
- **Catch-up is DB state, not event replay:** on (re)connect the daemon first
  calls `GET /api/bridge/sync` → `{ cursor, cap, queued[], active[] }` — the
  queued work orders as they exist NOW plus the runs this bridge is supposed to
  be executing — then subscribes from `cursor`. Offline queueing (PRD #35)
  falls out: runs dispatched while the daemon was down are simply still
  `queued` rows in the snapshot. Runs `active[]` claims that the daemon is NOT
  actually executing (daemon restarted, Engine died with it) are failed by the
  daemon via the normal transition POST (`failure_kind: "bridge-lost"`) —
  honest orphan handling.

**Steering therefore writes Atlas-first:** cancel/answer are server actions that
flip the run row through the M6 writers (single statement + outbox); the
browser sees the change in ≤2 s via ADR-0001, and the Bridge sees the SAME row
as a command. Late Bridge posts (an Engine finishing a just-cancelled run) lose
cleanly on the conditional claim (`WHERE state = from`) — no distributed lock.

### 3. Up-channel: plain token-authed POSTs into the single-statement writers

- `POST /api/bridge/runs/:id/claim` — `queued → running` + bridge id +
  worktree path/branch in ONE conditional statement (+ `started` outbox row).
  Two daemons racing a claim: one wins, one gets `not-claimed`.
- `POST /api/bridge/runs/:id/transition` — needs-input (question payload),
  review-ready (+ diff stats), failed (+ typed failure kind). Ticket
  follow-ups (`in-progress → review-ready|failed` via `applyTicketTransition`
  with the Run's actor) ride the same request, as their own atomic statements.
- `POST /api/bridge/runs/:id/helper-result` — the Helper deliverable write
  (enrichment / brief / ingest summary), validated against the owning module's
  parser, written with its outbox row in one statement; then the run completes.
- `POST /api/bridge/heartbeat` — every 30 s; updates `bridges.last_heartbeat_at`
  + capabilities. No outbox row (heartbeats are chrome, not history; the
  sidebar reads the column at render). The response returns the current
  `run_cap` so cap changes propagate without reconnect.

### 4. Stdout: its own table, its own cursor — never `feed_events`

The Bridge batches Engine stdout (rolling-tick flush, v1 stdout-tick idea) and
POSTs `{ chunks: [{ seq, content }] }` to
`POST /api/bridge/runs/:id/stdout`. `seq` is the daemon's per-run monotonic
counter; the unique `(run_id, seq)` index + `ON CONFLICT DO NOTHING` makes
retries idempotent. The browser reads
`GET /api/runs/:id/stdout?since=<seq>` — a per-run SSE stream polling the
chunk table every 1 s, frames carrying `id: <seq>` for Last-Event-ID resume.
~1–2 s glass-to-glass is in budget per ADR-0001's reasoning; sub-second is a
revisit trigger, not a v2.0 requirement.

## Why not alternatives

- **A dedicated command/queue table:** a second source of truth that can
  disagree with run state; the outbox already IS the command log, with the
  atomicity guarantee built in. If command fan-out ever outgrows feed_events
  (high-frequency steering, multi-bridge routing), add a `bridge_commands`
  outbox then — the daemon's event-router seam doesn't change.
- **WebSocket up+down:** one socket is elegant but buys nothing here — upstream
  POSTs want per-request auth/retry semantics anyway, and Vercel's function
  model prices a held-open socket the same as a held-open SSE response.
- **Bridge polls REST only (no SSE):** simplest, but answer latency becomes the
  poll interval; needs-input → answer → resume is the cockpit's hero loop and
  deserves the ≤2 s push path. (The sync endpoint means plain polling remains
  a degraded-mode fallback for free.)

## Addendum — M10 (2026-06-12): doctor + governance, additive

M10 extended the vocabulary WITHOUT changing the transport (charter
hard wall: additive in M9's idioms):

- **Pairing/revocation are domain writers** (`src/domain/bridge/pairing.ts`,
  shared by the UI and `scripts/pair-bridge.mjs`): atomic name-upsert
  (rotate on conflict) / revocation mark + `bridge-paired`/`bridge-revoked`
  outbox rows. A revoked bridge fails §1's token resolution — the 401 →
  fatal-stop rule needs no daemon change.
- **The doctor request rides the outbox** (PRD #34; the ship-requested
  idiom): `requestBridgeDoctor` marks `bridges.doctor_requested_at` +
  ONE `doctor-requested` row whose payload carries the preflight inputs
  the daemon can't know (project local_paths; legitimate kept-worktree
  run ids). §2's events route maps it to a `bridge-doctor` command for
  the ADDRESSED bridge only — the first non-broadcast command; run
  commands stay broadcast. `/api/bridge/sync` carries a fresh
  `doctorRequest` so the catch-up-is-DB-state property holds.
- **The verdict posts up §3-style:** `POST /api/bridge/doctor` →
  single-statement writer lands `bridges.doctor`, clears the marker,
  appends `doctor-completed` — browsers re-render via ADR-0001.
- **Heartbeats now ECHO the daemon's held cap** (optional body field) so
  the Bridges page can render "daemon holds cap N" as a report, never an
  inference. Heartbeats still write no outbox row; the Bridges page
  alone supplements ADR-0001 with a page-scoped 10 s poll
  (`src/components/live/HeartbeatPoll.tsx`) because its subject IS the
  beat — recorded as the one sanctioned exception.

## Consequences / revisit triggers

- One more long-lived function invocation per connected Bridge (cheap: one
  daemon per Owner machine, not per tab).
- Cross-entity consistency (run row → ticket row) is two atomic statements,
  not one — a crash between them leaves a run review-ready with its ticket
  still in-progress. Each statement is outbox-atomic, so nothing is invisible;
  the gap is self-describing and tolerated for v2.0.
- The Bridge package mirrors the wire types by hand (v1 failure-codes
  precedent — the daemon must not import app code); `tests/m9-bridge-protocol`
  imports BOTH sides and round-trips every frame, so drift fails CI.
- Revisit when: stdout needs sub-second latency (push bus / direct
  Bridge→browser tunnel), multiple Bridges per instance need routed commands,
  or steering grows beyond cancel/answer (v2.1 message injection — the event
  mapping extends; the vocabulary module stays the contract).
