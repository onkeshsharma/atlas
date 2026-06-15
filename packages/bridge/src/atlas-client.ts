/**
 * Typed HTTP client for the Atlas bridge API (ADR-0002 §3; v1 prior
 * art: lib/atlas-client.ts + lib/heartbeat.ts, rewritten). Every call
 * carries the bearer token; a 401 is fatal (revoked token must not
 * retry forever — v1 rule).
 */
import type {
  BridgeDoctorResult,
  HeartbeatBody,
  HelperResultBody,
  StdoutChunk,
  SyncResponse,
  TransitionBody,
  WorkOrder,
} from "./protocol.ts";
import { parseSyncResponse, parseWorkOrder } from "./protocol.ts";
import type { SkillInfo } from "./skills.ts";

export class TokenRejectedError extends Error {
  constructor() {
    super("Atlas rejected the bridge token (401) — re-pair with scripts/pair-bridge.mjs");
    this.name = "TokenRejectedError";
  }
}

export type AtlasClientOptions = {
  atlasUrl: string;
  token: string;
  fetchFn?: typeof fetch;
};

export class AtlasClient {
  private readonly atlasUrl: string;
  private readonly token: string;
  private readonly fetchFn: typeof fetch;

  constructor(opts: AtlasClientOptions) {
    this.atlasUrl = opts.atlasUrl.replace(/\/$/, "");
    this.token = opts.token;
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  private async request(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<{ status: number; json: unknown }> {
    const res = await this.fetchFn(`${this.atlasUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) throw new TokenRejectedError();
    const json = await res.json().catch(() => null);
    return { status: res.status, json };
  }

  async sync(): Promise<SyncResponse> {
    const { status, json } = await this.request("GET", "/api/bridge/sync");
    if (status !== 200) throw new Error(`sync returned ${status}`);
    const parsed = parseSyncResponse(json);
    if (!parsed) throw new Error("sync returned a malformed body");
    return parsed;
  }

  async workOrder(runId: string): Promise<WorkOrder | null> {
    const { status, json } = await this.request("GET", `/api/bridge/runs/${runId}`);
    if (status === 404) return null;
    if (status !== 200) throw new Error(`work-order returned ${status}`);
    return parseWorkOrder(json);
  }

  /** true = claimed; false = lost the claim (raced / already cancelled). */
  async claim(
    runId: string,
    body: { worktreePath: string | null; branch: string | null },
  ): Promise<boolean> {
    const { status } = await this.request("POST", `/api/bridge/runs/${runId}/claim`, body);
    if (status === 200) return true;
    if (status === 409) return false;
    throw new Error(`claim returned ${status}`);
  }

  /** true = applied; false = lost the conditional claim (run moved under us). */
  async transition(runId: string, body: TransitionBody): Promise<boolean> {
    const { status } = await this.request("POST", `/api/bridge/runs/${runId}/transition`, body);
    if (status === 200) return true;
    if (status === 409) return false;
    throw new Error(`transition returned ${status}`);
  }

  async postStdout(runId: string, chunks: StdoutChunk[]): Promise<void> {
    const { status } = await this.request("POST", `/api/bridge/runs/${runId}/stdout`, { chunks });
    if (status !== 200) throw new Error(`stdout returned ${status}`);
  }

  /** ok = deliverable landed + run completed; else the honest rejection reason. */
  async postHelperResult(
    runId: string,
    body: HelperResultBody,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    const { status } = await this.request(
      "POST",
      `/api/bridge/runs/${runId}/helper-result`,
      body,
    );
    if (status === 200) return { ok: true };
    // distinguish so the daemon can fail the run with an honest reason instead
    // of stranding it for the orphan sweep to mislabel `bridge-lost` (R-723).
    if (status === 422) return { ok: false, reason: "the deliverable did not match the required schema" };
    if (status === 409) return { ok: false, reason: "the run had already moved" };
    throw new Error(`helper-result returned ${status}`);
  }

  /** ADR-0007 Phase 2 — post an Athena consult's raw verdict; Atlas gates + answers. */
  async postConsultResult(runId: string, verdict: string): Promise<void> {
    const { status } = await this.request(
      "POST",
      `/api/bridge/runs/${runId}/consult-result`,
      { verdict },
    );
    if (status !== 200) throw new Error(`consult-result returned ${status}`);
  }

  /** M10 — the doctor verdict post; false = not claimed (revoked mid-run). */
  async postDoctor(result: BridgeDoctorResult): Promise<boolean> {
    const { status } = await this.request("POST", "/api/bridge/doctor", result);
    if (status === 200) return true;
    if (status === 409) return false;
    throw new Error(`doctor returned ${status}`);
  }

  /** returns the instance run cap from the response. */
  async heartbeat(body: HeartbeatBody): Promise<number | null> {
    const { status, json } = await this.request("POST", "/api/bridge/heartbeat", body);
    if (status !== 200) throw new Error(`heartbeat returned ${status}`);
    const cap =
      typeof json === "object" && json !== null && "cap" in json
        ? (json as { cap: unknown }).cap
        : null;
    return typeof cap === "number" ? cap : null;
  }

  /** M18 — report the resolved local checkout path back to Atlas. */
  async setProjectLocalPath(projectId: string, localPath: string): Promise<boolean> {
    const { status } = await this.request(
      "POST",
      `/api/bridge/projects/${projectId}/local-path`,
      { localPath },
    );
    if (status === 200) return true;
    if (status === 404 || status === 409) return false;
    throw new Error(`setProjectLocalPath returned ${status}`);
  }

  /**
   * ADR-0008 Phase 2 — report the project's harvested capabilities facet (the
   * skill inventory) + the constitution hash (freshness) from the live worktree.
   */
  async postProjectBrain(
    projectId: string,
    body: { skills: SkillInfo[]; constitutionHash: string },
  ): Promise<boolean> {
    const { status } = await this.request(
      "POST",
      `/api/bridge/projects/${projectId}/brain`,
      body,
    );
    if (status === 200) return true;
    if (status === 404 || status === 409) return false;
    throw new Error(`postProjectBrain returned ${status}`);
  }
}
