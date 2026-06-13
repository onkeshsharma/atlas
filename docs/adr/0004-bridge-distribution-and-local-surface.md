# ADR-0004 — Bridge distribution & local surface

- **Status:** accepted (planning, 2026-06-13) — supersedes nothing; extends ADR-0001
  (why the Bridge exists) and ADR-0002 (how it talks to Atlas).
- **Author:** Fable (planning role); builds orchestrated to Sonnet per the standing split.
- **Owners:** the BP track (BP1 CLI · BP2 pairing handshake · BP3 packaged service + tray).

## Context

The Bridge daemon (`packages/bridge`, ADR-0001/0002) works, but its only install story
is "clone the monorepo and `node src/index.ts` with env vars." That is a developer-grade
install — fine for the Owner, who is a developer, but it is the single largest wall
between "Atlas works for me" and "Atlas works for anyone else." Onkesh asked whether the
Bridge should become an installable, always-present desktop presence (Option 2 of three
considered: bare CLI / installed background-service-with-menubar / full desktop app).

The full desktop app (Option 3) was rejected in design: it would re-implement the run
list, session view, and logs that Atlas's cockpit ALREADY shows (M9 run pages, M10
`/settings/bridges`), producing two surfaces that can disagree — the exact drift the v2
canon-first rebuild exists to prevent. Option 2 was chosen.

## Decisions

### 1. Distribution is a three-rung ladder, built in sequence
- **BP1 — published CLI** (`atlas-bridge pair|start|stop|status|doctor`, config file
  instead of env soup). Cheapest, highest-leverage; turns "clone the monorepo" into one
  command. Fully buildable + testable on this machine.
- **BP2 — click-to-pair handshake.** Atlas mints the token to the daemon over a loopback
  callback so the Owner never copy-pastes a secret. Web + CLI; buildable + testable here.
- **BP3 — packaged background service + minimal menubar.** Install once, runs on login,
  a tray icon is the affordance. Code buildable here (Windows); signed cross-platform
  artifacts are Owner-gated (see §6).

### 2. The local surface is deliberately minimal — Atlas is the eyes
The daemon's own UI shows ONLY what Atlas structurally cannot, and nothing Atlas already
renders better:
- pre-pairing / first-run / "can't reach Atlas" (Atlas doesn't know the machine exists yet);
- a machine's-eye status line (online · paired as `<name>` · engine binary found · N running);
- the **stop/pause control** — the user's authority over a process running on their own
  machine MUST be local, never cloud-only;
- local logs/diagnostics too noisy or sensitive to stream up.

Everything rich (live runs, stdout, diffs, the doctor, the cap, capabilities) stays in
the cockpit, where it is already built and live. The tray's richest action is a deep link
that opens `/settings/bridges`. **No run list, no session manager, no second dashboard.**

### 3. Shell technology: Node Single-Executable-App + a lightweight native tray — NOT Tauri
The daemon is already Node 24 (runs TS directly, erasable syntax, no build step). For a
surface this small, Tauri's Rust toolchain + sidecar IPC is unjustified complexity and a
second language. Decision: ship the daemon as a **Node SEA** (`node --experimental-sea`,
one binary per OS) fronted by a thin native tray (a small, well-maintained tray library,
or a per-OS native shim). One language, one signable artifact per platform, the daemon IS
the app. Tauri is the documented fallback ONLY if the local surface ever needs to grow
past §2 — which §2 says it must not.

### 4. Pairing handshake — loopback click-to-pair, with paste-token retained for headless
Primary flow (`atlas-bridge pair`, same machine as the browser):
1. CLI picks a free loopback port `P`, generates a `state` nonce, starts a one-shot
   `http://127.0.0.1:P` listener.
2. CLI opens the browser to
   `<atlas>/settings/bridges/pair?name=<machine>&cb=http://127.0.0.1:P/callback&state=<nonce>`.
3. Atlas's pair route is **Owner-guarded** (the Owner is already signed in). It renders an
   approve screen naming the machine and what pairing grants ("can run Engine sessions on
   your repos"). On approve (server action), Atlas calls the existing `pairBridge` domain
   fn → mints token + stores only its hash → 302s the browser to
   `http://127.0.0.1:P/callback?token=<once>&state=<nonce>&name=<machine>`.
4. CLI validates `state`, writes the token to `~/.atlas-bridge/config.json` (chmod 600),
   serves a "you can close this tab" page, exits success. The token is never shown to the
   user and never logged.

Security posture: approval happens inside the Owner's authenticated Atlas session; the
callback is loopback-only; `state` is single-use; the token transmits exactly once.
PKCE-style hardening is a noted follow-up, not v1. **The existing manual paste-the-token
path (M10) is retained verbatim as the headless/remote fallback** (a build server with no
browser).

### 5. Service posture
Install registers a login-item / background service (launchd on macOS, a Windows Service /
Startup entry on Windows). The process auto-starts, but is **inert until paired** and
honors a local `paused` state; the stop/pause control is always reachable from the tray.
The dial-out-only network posture from ADR-0002 is preserved — **the daemon opens no
inbound ports** (the loopback listener in §4 exists only for the seconds of a `pair` run).

### 6. Owner-gated steps (CI / this machine cannot produce them)
- **Code-signing**: a Windows signing cert (ideally EV) and Apple Developer ID; an
  unsigned "runs Claude Code on your repos" daemon is a Gatekeeper/SmartScreen and trust
  failure.
- **Apple notarization + the macOS artifact itself**: needs a Mac and the Owner's Apple
  credentials; cannot be built on this Windows host at all.
- **An auto-update channel** for installed daemons (a versioned protocol needs a
  version-skew story; the protocol is already typed per ADR-0002 — handle skew there).
These are documented in a runbook (BP3), not automated.

## Consequences / revisit triggers
- The CLI + handshake (BP1+BP2) deliver most of the *felt* Option-2 experience on their
  own (one-command install, click-to-pair) and are shippable independently of the packaged
  artifact — they are the v2.1 candidate; BP3 follows when signing credentials are in hand.
- Revisit the "minimal local surface" rule (§2) only with a new ADR — the pull to grow a
  tray dashboard is exactly what this ADR forbids.
- Revisit Node-SEA vs Tauri (§3) only if §2 is ever amended to need a rich local window.
