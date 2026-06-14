# ADR-0006 — Engine back-channel (MCP) + Athena, the AFK decision delegate

- **Status:** accepted (2026-06-14, grill-with-docs). Builds on ADR-0002 (bridge
  transport). Author: orchestrator; spike-validated against `claude` v2.1.177 before
  acceptance. Supersedes the `control_request`-based needs-input sketch in
  `packages/bridge/src/engine/real.ts:11-15`.
- **Goal:** make a real-engine Run *always resolve* — to a completion (review-ready),
  a question (needs-input), or an honest failure — and never sit silently in `running`.

## Context

Run **R-718** (a real-engine `ingest-project` helper) hung in `running` for ~25 min,
asked a free-text question the cockpit never surfaced, and would have died at the 2h wall
clock as `engine-timeout`. Diagnosis (`notes/ENGINE-GAPS-2026-06-14.md`) found three
compounding gaps in `real.ts`, all stemming from one root cause — the real engine has no
working two-way channel:

1. **Free-text questions are invisible.** `onQuestion` fires only inside
   `case "control_request"` (real.ts:127). An end-of-turn text question (real.ts:121-126)
   just streams to stdout; the Run never flips to `needs-input`.
2. **A finished turn never ends the Run.** `--input-format stream-json` keeps stdin open;
   the `result` frame is captured (real.ts:142) but acted on by nothing, so
   `await supervised.exited` (real.ts:197) hangs to the 2h timeout.
3. **Real-engine helper delivery is unimplemented.** real.ts:206-216 hard-fails the
   `helper` lane — only the fake engine produces a `HelperResultBody`.

A finding reframed the whole problem: real.ts spawns with `--dangerously-skip-permissions`
(real.ts:99), and under that flag Claude Code emits **no `can_use_tool` control_request
frames** — so the *only* needs-input path is dead. Real-engine needs-input isn't buggy;
it's 0% reachable. This is not three bug-fixes; it's a decision about what interaction
model the real engine should have. The product thesis ("steer live runs") and the glossary
("Needs Input" = blocked on a question *or* permission) both require a real back-channel.

A second goal emerged in the grill: **minimum Owner feedback.** Atlas's value over a cloud
terminal is autonomy — a Run that pesters constantly is a failure. So the back-channel must
be routable to a *non-human* resolver when the Owner is away.

## Decisions

### 1. Interaction model: interactive back-channel, resolved by the `result` frame
The real engine runs as an interactive stream-json session (not single-shot). The
stream-json **`result` frame is the turn boundary** that resolves the Run: on
`subtype=success` → `review-ready` (ticket lane) or `helper-complete` (helper lane); on
error/non-zero exit → `failed`. Acting on the `result` frame (closing stdin) is the fix
for Gap 2. _Spike B proved it: with stdin held open the process stayed alive 5s past the
`result` frame (the R-718 hang); closing stdin exited it code 0 in ~0.6s._

### 2. The ask channel is a Bridge-hosted MCP tool, `ask_owner` (NOT `control_request`)
The Bridge hosts a local MCP server passed to the engine via `--mcp-config`. It exposes
**`ask_owner(question, options?)`**: the engine's tool call **blocks inside the Bridge**
until a resolver answers, and the answer returns as the tool result so the engine continues
*in the same turn*. This makes the `result` frame unambiguously mean "done" (no
paused-vs-done heuristic), and maps directly onto the existing `EngineSession.answer()`
(which resolves the pending tool-call promise). Chosen over the two alternatives because it
is the only channel that satisfies all three needs — see Considered Options. _Spike A proved
it: the model called `mcp__atlas__ask_owner` with structured args, the tool blocked 3.0s
and the model waited, the returned value flowed back as `tool_result` and into the final
answer — all one turn; zero `control_request` frames (confirming the native path is dead
under skip-permissions)._

### 3. The helper deliverable is a second MCP tool, `submit_result`
Same server, same seam: **`submit_result(body)`** lets the engine deliver the structured
`HelperResultBody` (`enrich-ticket | draft-brief | ingest-project`), validated at the
call site so a malformed body is rejected and retried *before* the turn ends. On
`result`-success the Bridge already holds a validated payload → `helper-complete`; if the
engine never called it, honest-fail "helper finished without a deliverable" (mirroring
`fake.ts:149-153`). This closes Gap 3. It also makes helper-brief **prompt-scoping
enforceable** ("describe, don't do"): an ingest Run cannot succeed *except* by calling
`submit_result`, which is what stops the R-718 wander into the target repo's own backlog.

### 4. The resolver is the Owner — or Athena under AFK
The ask channel is resolver-agnostic (the engine never knows who answered), so "who
answers" is a Bridge-side policy:
- **Owner** (default): the Ask surfaces as `needs-input`; the Owner replies.
- **Athena** (the AFK decision delegate): under a global **AFK Mode** toggle, every Ask is
  auto-answered by Athena so Runs keep moving with zero human latency. Athena is also a
  **fallback even when AFK is off** — an unanswered Ask is handed to her after a timeout
  (default 10 min, configurable), so a Run never stalls the queue because the Owner stepped
  away. `needs-input` remains a legitimate *resting* state, not a hang.
- **Athena v2.x = a second-opinion call** (not a full second engine): one Claude call given
  the Ask + curated context (Brief, Ticket, recent transcript, diff-so-far), returning
  `{answer, confidence, rationale}`. Low-confidence answers escalate back to the Owner.
- **Every Athena decision is recorded as `delegate-answered`** and surfaced at review
  ("3 decisions made while you were away") — autonomy stays audited. Named for the goddess
  of wisdom (born of Metis/counsel; the advisor who acts in your stead as Mentor). Designed
  to be fleshed out later (e.g. a council/panel); the second-opinion call is the v2.x floor.

## Considered Options (ask channel)

| | MCP `ask_owner` (chosen) | Native `control_request` | Stdout sentinel |
|---|---|---|---|
| Carries semantic decisions (not just tool-permission) | ✅ | ❌ | ✅ |
| Blocks + resumes in one turn | ✅ | ✅ | ❌ (ends turn; resume = new stdin turn) |
| Clean in-Bridge seam to swap resolver to Athena | ✅ | ⚠️ tool-decisions only | ⚠️ parse-and-reinject |
| Robust (structured I/O vs prompt-dependent markers) | ✅ | ✅ | ❌ |
| Works under `--dangerously-skip-permissions` | ✅ | ❌ (suppressed) | ✅ |

`control_request` can't express "migrate or drop?" (not a tool) and is suppressed by our
permission flag; the sentinel is fragile (needs exact markers + a reliable halt) and makes
the `result` frame ambiguous. AFK is the deciding factor: it needs a single structured
interception point, which only the MCP tool provides.

## Consequences

- **The Bridge gains an MCP server** hosting `ask_owner` + `submit_result`, launched with
  the engine via `--mcp-config --strict-mcp-config`. **Transport:** the daemon re-execs its
  OWN binary as a stdio MCP server (`atlas-bridge __mcp`), which connects back to the daemon
  over a localhost TCP line (port + per-run token passed via env) to forward asks/results
  and receive answers. Chosen over an in-daemon HTTP server because a stdio *child script*
  can't ship inside the SEA binary (the sibling-file problem fake.ts:32-45 documents), and
  re-exec keeps everything in the one binary with the already-proven hand-rolled stdio MCP
  (no SDK dependency). The daemon spawns `claude` with **`MCP_TOOL_TIMEOUT`** set to cover
  the max AFK wait (+fallback). _Spike-validated against `claude` v2.1.177: stdio MCP
  block+resume in one turn; `ask_owner` held 70s (past the ~60s default) with
  `MCP_TOOL_TIMEOUT=600000`; `result` frame = turn-end; zero `control_request` under
  skip-perms._
- **`--dangerously-skip-permissions` stays** — the native `control_request` path is
  intentionally unused (the deny-list `settings.json` still hard-blocks catastrophic ops).
  Tool-level permission gating, if ever wanted, is a separate future layer.
- **`real.ts` is rewritten**; the fake engine's `@@ATLAS:ASK/RESULT/DONE` sentinel protocol
  is unchanged (suites + e2e run on fake only — charter hard wall), so the two adapters
  stay behaviorally symmetric at the `EngineOutcome` boundary.
- **Athena is new product surface** (AFK toggle, delegate-answered feed kind + audit
  trail). The second-opinion call is the v2.x scope; the repo-aware delegate is deferred
  until real runs show the cheap one guessing badly.
- **Glossary updated** (`CONTEXT.md`: Ask, AFK Mode, Athena; Needs Input amended).
- **Until this ships, real-engine ingest is a known dead-end** (it hangs every dispatch) —
  do not re-dispatch one. Confirmed twice (R-718, R-719).
