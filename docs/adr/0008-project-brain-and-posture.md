# ADR-0008 — Project Brain + Posture-typed runs (constitution-aware Atlas)

- **Status:** accepted (2026-06-15). Author: orchestrator with Onkesh. Triggered by
  R-721 (an `ingest-project` helper run hijacked by the target repo's `CLAUDE.md`).
- **Goal:** make Atlas *constitution-aware* — able to know, trust, and use each
  project's own `CLAUDE.md` / skills / method — so work is done in the project's
  flavour, the project's capabilities are visible and reusable, and a run can never
  again be diverted from its job by the repo it runs in.

## Context

R-721 failed as *"helper finished without calling submit_result."* The forensics
(prod DB + daemon code): an `ingest-project` helper ran **inside the target repo's
worktree**, Claude auto-loaded that repo's `CLAUDE.md` + phase router
(`07_AUDIT_HARDEN_LOOP.md`), and the engine **obeyed the repo's dev plan** instead of
producing the ingest deliverable — then asked *"which P1 first?"* in **prose** (not via
`ask_owner`), so it never became a `needs-input` Ask, Athena never engaged, and the
helper exited without `submit_result`.

The instinct to *suppress* `CLAUDE.md` is wrong. A good `CLAUDE.md` is the single most
valuable artifact in the repo — it encodes the project's **method** (phase router),
**flavour** (conventions/canon), **capabilities** (skills), and **vocabulary** (glossary).
We want to *join it, not fight it*. Every issue we've hit is a symptom of one root gap:

> **Atlas is constitution-blind, and its runs are posture-less.**

- R-721 hijack → a run with no declared *posture* toward the constitution.
- Question-in-prose → no enforced *exit contract*.
- Athena can't help → she has no *flavour* (no model of the project).
- Skills invisible/unreused → the *capabilities* facet is unmodeled.
- A stale `CLAUDE.md` misled the engine (it literally offered to fix the stale line) →
  the constitution is treated as *permanent truth* instead of a *freshness-tracked cache*.

Considered strategies and why the partial ones fail (full comparison in the session
record): **guardrails-only** abandons the value (keeps fighting `CLAUDE.md`);
**stored-context** goes *stale* — R-721's own manual was stale; **bridge-live-only**
makes cloud Athena second-class and leaves Atlas nothing to reason about when no run is
live; **posture-only** is the correctness half but delivers no flavour/skills. None is a
real alternative to the others — they are **facets of one correct model.**

## Decisions

### 1. The Project Brain — a freshness-tracked **cache**, not a permanent record
Ingest harvests the project's constitution into a model with four facets, each landing in
a home Atlas already has:
- **Method** (phase router) → future orchestration / "next move" suggestions.
- **Flavour** (conventions/canon) → injected into coding briefs + Athena's prompt.
- **Capabilities** (skills) → the **Skills layer** (§3).
- **Vocabulary** (glossary) → **already** stored as project context-terms from ingest.

The Brain is **content-hash-versioned and freshness-aware**: the live bridge reports the
constitution's hash on heartbeat / run-start; a mismatch marks the project
*"constitution drifted"* and triggers re-harvest. **The Brain is never blindly trusted —
it carries a staleness state.** (This resolves stored-context's fatal staleness with
bridge-live's freshness.)

### 2. Posture-typed runs — derived from the existing `lane`
Each run declares its *relationship* to the constitution:
- `lane=owner` → **Obey**: the constitution is authoritative (the flavour + skills we want).
- `lane=helper` → **Reference**: the constitution is *source material to summarize, never
  orders*; **hard exit contract** (`submit_result` or `ask_owner` only), enforced by a
  `PreToolUse` hook written into the per-run `.claude/settings.json` we already emit —
  which would have *blocked* R-721's wander.
- (`Sandbox` reserved for future.)

The hook earns its place for **enforcement** (blocking); **stream `tool_use`-frame
parsing** does the **observability** — each mechanism used where it is strongest.

### 3. Skills as a first-class facet — observe → store → recommend (the Phase-4 loop)
- **Inventory** — walk `.claude/skills/*/SKILL.md`, parse frontmatter (name/description/
  invocability) into a per-project skill registry.
- **Usage** — the daemon detects a `Skill` `tool_use` block in the run stream
  (`name: "Skill"`, `input: { skill }` — empirically confirmed) → a `skill_usage` ledger
  (modelled on `athena_spend`, so it does not spam the feed) + an optional per-run inbox
  summary.
- **Freshness** — content-hash each skill; an edit emits a *"skill updated"* event +
  re-harvest.
- **Recommend** — `rankSimilar` (the Phase-4 decision-memory engine) over the registry:
  *"`/grill` is heavy in `map`; `acme-web` is similar and lacks it — vendor it?"* Tooling
  propagates to where it is observed to help.

### 4. Bridge-first flavour, cloud-cache fallback
Coding runs and **bridge** Athena consults read the constitution + skills **live in the
worktree** (always fresh; bridge Athena can even *invoke* the project's skills). **Cloud**
Athena uses the Brain cache **with its freshness flag shown**. Truth lives where it is
freshest.

### 5. The two-way street — Atlas keeps the constitution honest
Runs already *rewrite* `CLAUDE.md`. Atlas detects drift (Brain hash vs live) and can
dispatch a run whose deliverable is *"reconcile `CLAUDE.md` with reality."* The
orchestrator maintains each project's self-knowledge.

## Considered options / trade-offs
- **Suppress `CLAUDE.md` for helpers (S1) vs. model it (S5):** chose to model it —
  suppression throws away the project's own knowledge; posture + contract make modelling
  safe without suppression.
- **Stored snapshot (S2) vs. freshness-tracked cache (S5):** chose the cache — a snapshot
  inherits drift (the very failure we saw).
- **Hook vs. stream-parse for skill usage:** use both, by strength — hook *enforces*
  (can block), stream-parse *observes* (no new failure surface, uniform across skill types).
- **Authority of `CLAUDE.md`:** it is an authority surface. Acceptable because it is the
  Owner's own repo — but helpers keep the hard contract so a messy/stale manual can never
  make a worker wander or self-terminate, and Athena's high-stakes rail + budget still bound her.

## Consequences
- A multi-phase build (each phase a tested slice that ships value + de-risks the next):
  **Phase 1** posture for helpers (exit contract + Skill-blocking hook — *closes R-721*) +
  Skills inventory & usage; **Phase 2** the Brain + freshness (harvest 4 facets, hash
  versioning, drift detection); **Phase 3** flavour everywhere (inject Brain into coding
  briefs + Athena, bridge-live / cloud-cache); **Phase 4** cross-project skill
  recommendation + constitution self-maintenance.
- New persisted state: a skills registry + `skill_usage` ledger (Phase 1); the Brain model
  + constitution hash per project (Phase 2). Reuses the `feed_events` outbox, the per-run
  `settings.json`, the stream parser, and `rankSimilar`.
- Posture is derived from `lane` today; an explicit per-run override is a fast-follow.
- The `Skill` `tool_use` shape is officially undocumented — detection is defensive and
  pinned by an empirical capture (see Phase 1 notes).
