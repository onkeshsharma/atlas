# ADR-0007 — Athena execution model: escalating consult ladder, Council, AFK levels

- **Status:** accepted (2026-06-15, grill-with-docs). Extends ADR-0006 §4 (which shipped
  the cloud quick-tier). Author: orchestrator with Onkesh.
- **Goal:** turn Athena from a single cloud second-opinion call into a self-escalating
  decision body that spends on quality only when a decision is genuinely hard, stays
  bounded in cost, keeps the Owner in control, and can be trusted enough to leave running.

## Context

ADR-0006 shipped Athena as one Atlas-side Sonnet call over curated text — a good floor, but
it can't read the actual code, it forces an Anthropic key into Atlas, and it's a single
opinion. Onkesh asked for: (1) set the key in-app, (2) a visible "Athena is active" signal,
(3) a configurable takeover delay, and (4) "Athena as a second daemon on a bridge" — a
repo-aware delegate. The grill resolved these into one coherent model rather than four
bolt-ons.

The keystone fact: the Engine already runs `claude` **on the Bridge** using the Owner's own
Claude auth (`real.ts`), and a Run is in `needs-input` **only because a Bridge is running
it** — so a bridge (with the worktree) is always available to consult. That dissolves the
key problem for the bridge path and makes "Athena as a bridge consult" natural.

## Decisions

### 1. A self-escalating consult ladder
```
Ask → quick consult (text) → repo-aware consult (worktree) → Council → Owner
```
Each rung is climbed only when the rung below isn't confident; Athena itself decides when it
needs the code. Consults are **ephemeral** (spin up → decide → hand the answer to the daemon
via `answerRun(answeredBy="Athena")` → close) and run at the **highest available model +
`xhigh` effort** (rare, costly-to-get-wrong decisions deserve the spend; `xhigh` over `max`
to avoid overthinking).

### 2. Two execution locations, both Owner-selectable
- **Bridge** — the bridge that owns the Run runs the consult (uses the bridge's `claude`
  auth → **no Atlas API key, no DB secret**; the worktree is right there for the repo-aware
  tier). Triggered by a new `consult-ask` command on the existing command stream.
- **Cloud** — an Atlas-side API call (needs a key, but isolates Athena's cost/capacity from
  real Runs). This is ADR-0006's shipped path, retained as an option.

### 3. The cloud-tier API key: in-app, encrypted at rest, env fallback
Settings field; stored as ciphertext (KEK in env); write-only/masked; read at runtime (no
redeploy); falls back to the env var. This is the **first reversible secret in the DB** (a
usable API key can't be hashed like bridge/API tokens) — encryption-at-rest is the
mitigation. Only consulted when the cloud tier is enabled.

### 4. AFK is a three-level dial, with a safety rail
- **Off** — Asks wait for the Owner; an unanswered Ask falls back to Athena after the
  (configurable, default 10 min) timeout.
- **On (standard)** — Athena answers immediately, but the **rail** holds: **human-only**
  Asks escalate to the Owner. Two rail sources, belt-and-suspenders: (a) the Engine flags
  high-stakes/irreversible Asks via `ask_owner`, and (b) Athena self-judges high-stakes
  calls and refuses them regardless of confidence.
- **Ultra Athena** — the rail is OFF; Athena answers everything. Opt-in with a warning.
  **Ultra lifts ONLY the decision rail — the machine-safety floor stays** (the Bridge's
  deny-list: no `rm -rf`, no `git push`, no open web — the sole-publisher invariant). Even
  god-mode can't make the Engine destroy the box or publish directly.

### 5. The Council (top rung)
N delegates (Owner-configurable, **default 3**) reason with **distinct lenses** (cautious
reviewer / ship-it pragmatist / correctness-against-brief checker) over the same top model,
then **vote**: answer on a **majority** (≥2 of 3) with sufficient confidence; **split or
low confidence → Owner**. Each vote + rationale is recorded ("Council answered (2 of 3)").
Convened only at the top of the ladder, so cost stays bounded. This realizes the
"Athena-as-a-body" intent from the naming.

### 6. Visibility & accountability
A persistent, **level-aware shell chip** (calm amber for standard, loud rose for Ultra) with
a live count, linking to an **Athena activity view** (per decision: Ask, answer, confidence,
rationale, which tier/who voted). Intervention = **cancel the still-running Run** (no magic
undo once the Engine has acted). **Notifications fire only on low-confidence or high-stakes
decisions** — the ones worth interrupting the Owner for.

### 7. Learning & budget
- **Decision memory** (per-instance): consults retrieve the top-K most similar past **Owner**
  decisions and inject them as context. Learns from Owner answers **and un-overridden Athena
  answers, with Owner answers weighted higher**. Viewable/prunable from the activity view.
- **Budget**: a configurable governor that gates the **expensive rungs** (repo-aware /
  Council); on cap it **fails safe to the Owner** (escalate, never silent overspend), plus an
  optional cloud-$ ceiling.

## Considered Options / trade-offs
- **All-on-bridge (no key ever) vs keep a cloud tier:** kept both — bridge avoids secrets
  and is repo-aware; cloud isolates Athena's cost from real Runs. Owner picks.
- **Ultra lifting the deny-list (god-mode) vs decision-rail-only:** chose decision-rail-only;
  floor-lifting, if ever wanted, is a separate even-more-gated toggle.
- **Council diversity by model vs by lens:** chose lens diversity (robust, available);
  majority-of-3 over unanimous (which over-escalates) or confidence-weighted (hard to trust).
- **Learning from Athena's own answers:** included un-overridden ones (faster) but weighted
  Owner answers higher (avoids echo chamber).

## Consequences
- A multi-phase build (each phase a tested slice): **Phase 1** AFK controls (3-level dial +
  rail + in-app key + delay + chip/activity/notifications) on the shipped cloud tier;
  **Phase 2** the bridge consult + repo-aware escalation (`consult-ask` command);
  **Phase 3** the Council; **Phase 4** learning + budget. Fast-follows: per-Run AFK at
  dispatch, per-project scope rules, AFK schedule.
- `ask_owner` gains an optional human-only/stakes signal (additive bridge change).
- Glossary updated: Athena, AFK Mode (3 levels), Human-only Ask, Ultra Athena, Council
  (intake-atlas-v2/CONTEXT.md).
