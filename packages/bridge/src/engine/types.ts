/**
 * EngineAdapter — the seam between orchestration and execution
 * (charter §4). TWO implementations:
 *
 *  - fake.ts  — a scripted BINARY (real child process, deterministic
 *    behavior driven by @fake: directives) — suites and e2e run on this
 *    and ONLY this.
 *  - real.ts  — spawns Claude Code (v1 engine-spawner prior art) —
 *    NEVER exercised by tests; Onkesh's acceptance smoke is its proof.
 */
import type {
  FailureKind,
  HelperResultBody,
  NeedsInputAnswer,
  NeedsInputQuestion,
  WorkOrder,
} from "../protocol.ts";

export type EngineOutcome =
  | { result: "review-ready" }
  | { result: "helper-complete"; payload: HelperResultBody }
  | { result: "failed"; failureKind: FailureKind; detail: string }
  | { result: "cancelled" };

export type EngineSession = {
  /** deliver the Owner's answer — resumes the blocked session. */
  answer: (answer: NeedsInputAnswer) => void;
  /** stop now (SIGTERM, SIGKILL after grace) — outcome resolves cancelled. */
  cancel: () => void;
  /** resolves exactly once with the session's outcome. */
  done: Promise<EngineOutcome>;
};

export type EngineStartArgs = {
  order: WorkOrder;
  /** the run's git worktree (null for repo-less helper runs). */
  worktree: string | null;
  /** sandbox dir for session-internal files (settings, logs). */
  sandbox: string;
  timeoutMs: number;
  onStdout: (text: string) => void;
  onQuestion: (question: NeedsInputQuestion) => void;
};

export type EngineAdapter = {
  flavor: "real" | "fake";
  start: (args: EngineStartArgs) => EngineSession;
};
