/**
 * Fake Atlas — the OTHER end of the typed vocabulary (charter §9:
 * "protocol fake-Bridge ↔ fake-Atlas"). An in-process HTTP server
 * implementing the ADR-0002 endpoints over an in-memory store, with the
 * same conditional-claim semantics as the real single-statement writers
 * (claims lose with 409). The daemon under test runs UNCHANGED against
 * it — the protocol is the contract.
 */
import { randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import type { NeedsInputAnswer, NeedsInputQuestion, RunState } from "../src/protocol.ts";

export type FakeRun = {
  runId: string;
  ref: string;
  title: string;
  state: RunState;
  lane: "owner" | "helper";
  helperKind: "enrich-ticket" | "draft-brief" | "ingest-project" | null;
  queuePosition: number | null;
  project: { id: string; name: string; slug: string; localPath: string | null };
  ticket: {
    id: string;
    ref: string;
    title: string;
    body: string;
    kind: string | null;
    priority: string;
  } | null;
  briefBody: string | null;
  question: NeedsInputQuestion | null;
  answer: NeedsInputAnswer | null;
  bridged: boolean;
  worktreePath: string | null;
  branch: string | null;
  failureKind: string | null;
  failureDetail: string | null;
  diffStats: unknown;
  diffPatch: string | null;
  shipRequested: boolean;
  prUrl: string | null;
  mergeSha: string | null;
  helperResult: unknown;
  stdout: Map<number, string>;
};

type OutboxRow =
  | { cursor: number; type: "run-available"; runId: string; lane: "owner" | "helper" }
  | { cursor: number; type: "run-cancelled"; runId: string }
  | { cursor: number; type: "run-answered"; runId: string; answer: NeedsInputAnswer }
  | { cursor: number; type: "run-ship"; runId: string };

export class FakeAtlas {
  readonly token: string;
  cap = 2;
  runs = new Map<string, FakeRun>();
  heartbeats: unknown[] = [];
  private outbox: OutboxRow[] = [];
  private cursor = 0;
  private server: Server | null = null;
  private port = 0;
  private nextRun = 1;

  constructor(token = "fake-atlas-token") {
    this.token = token;
  }

  get url(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  /** create + queue a run and emit run-available (a dispatch). */
  enqueueRun(input: Partial<FakeRun> & { localPath?: string | null }): FakeRun {
    const n = this.nextRun++;
    const run: FakeRun = {
      // globally unique — run ids become branch names in the SHARED test
      // repo (atlas/run/<id>); a reused id would collide across tests.
      runId: `00000000-0000-4000-8000-${randomBytes(6).toString("hex")}`,
      ref: `R-${900 + n}`,
      title: input.title ?? `Fixture run ${n}`,
      state: "queued",
      lane: input.lane ?? "owner",
      helperKind: input.helperKind ?? null,
      queuePosition: input.queuePosition ?? n,
      project:
        input.project ??
        ({ id: "p1", name: "fixture", slug: "fixture", localPath: input.localPath ?? null }),
      ticket:
        input.ticket !== undefined
          ? input.ticket
          : {
              id: `t-${n}`,
              ref: `T-${900 + n}`,
              title: input.title ?? `Fixture ticket ${n}`,
              body: "Plain story.",
              kind: "bug",
              priority: "soon",
            },
      briefBody: input.briefBody ?? null,
      question: null,
      answer: null,
      bridged: false,
      worktreePath: null,
      branch: null,
      failureKind: null,
      failureDetail: null,
      diffStats: null,
      diffPatch: null,
      shipRequested: false,
      prUrl: null,
      mergeSha: null,
      helperResult: null,
      stdout: new Map(),
    };
    this.runs.set(run.runId, run);
    this.outbox.push({
      cursor: ++this.cursor,
      type: "run-available",
      runId: run.runId,
      lane: run.lane,
    });
    return run;
  }

  /** the cockpit cancels (Atlas-first steering) and the outbox tells the
   * daemon. review-ready included: KK's send-back declines a result
   * (legal table: review-ready → cancelled). */
  cancelRun(runId: string): boolean {
    const run = this.runs.get(runId);
    if (!run || !["queued", "running", "needs-input", "review-ready"].includes(run.state)) {
      return false;
    }
    run.state = "cancelled";
    this.outbox.push({ cursor: ++this.cursor, type: "run-cancelled", runId });
    return true;
  }

  /** the cockpit answers: needs-input → running + run-answered command. */
  answerRun(runId: string, answer: NeedsInputAnswer): boolean {
    const run = this.runs.get(runId);
    if (!run || run.state !== "needs-input") return false;
    run.state = "running";
    run.answer = answer;
    this.outbox.push({ cursor: ++this.cursor, type: "run-answered", runId, answer });
    return true;
  }

  /** Session B — the KK CTA: ship_requested_at + run-ship command. */
  requestShip(runId: string): boolean {
    const run = this.runs.get(runId);
    if (!run || run.state !== "review-ready" || run.shipRequested) return false;
    run.shipRequested = true;
    this.outbox.push({ cursor: ++this.cursor, type: "run-ship", runId });
    return true;
  }

  /** mark a run as actively assigned to the bridge (orphan-sweep fixtures). */
  seedActive(state: "running" | "needs-input", input: Partial<FakeRun> = {}): FakeRun {
    const run = this.enqueueRun(input);
    this.outbox.pop(); // not a dispatch — it was already running "before"
    run.state = state;
    run.bridged = true;
    return run;
  }

  async start(): Promise<void> {
    this.server = createServer((req, res) => void this.route(req, res));
    await new Promise<void>((resolve) =>
      this.server!.listen({ port: this.port, host: "127.0.0.1" }, resolve),
    );
    const address = this.server.address();
    if (address && typeof address === "object") this.port = address.port;
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    const server = this.server;
    this.server = null;
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  /** restart on the SAME port (offline-queue reconnect scenarios). */
  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  private async route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.headers.authorization !== `Bearer ${this.token}`) {
      res.writeHead(401).end("Unauthorized");
      return;
    }
    const url = new URL(req.url ?? "/", this.url);
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };
    const readBody = async (): Promise<unknown> => {
      let raw = "";
      for await (const chunk of req) raw += chunk;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };

    // GET /api/bridge/sync
    if (req.method === "GET" && url.pathname === "/api/bridge/sync") {
      const queued = [...this.runs.values()].filter((r) => r.state === "queued");
      const active = [...this.runs.values()].filter(
        (r) => r.bridged && (r.state === "running" || r.state === "needs-input"),
      );
      const shipRequested = [...this.runs.values()].filter(
        (r) => r.state === "review-ready" && r.shipRequested,
      );
      json(200, {
        cursor: this.cursor,
        cap: this.cap,
        queued: queued.map((r) => ({
          runId: r.runId,
          ref: r.ref,
          lane: r.lane,
          helperKind: r.helperKind,
          queuePosition: r.queuePosition,
        })),
        active: active.map((r) => ({ runId: r.runId, state: r.state })),
        shipRequested: shipRequested.map((r) => r.runId),
      });
      return;
    }

    // GET /api/bridge/events (SSE)
    if (req.method === "GET" && url.pathname === "/api/bridge/events") {
      const sinceRaw = req.headers["last-event-id"] ?? url.searchParams.get("since") ?? "0";
      let since = Number(sinceRaw) || 0;
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      });
      res.write(": hello\n\n");
      const timer = setInterval(() => {
        for (const row of this.outbox) {
          if (row.cursor <= since) continue;
          since = row.cursor;
          res.write(`id: ${row.cursor}\nevent: ${row.type}\ndata: ${JSON.stringify(row)}\n\n`);
        }
      }, 50);
      req.on("close", () => clearInterval(timer));
      return;
    }

    // POST /api/bridge/heartbeat
    if (req.method === "POST" && url.pathname === "/api/bridge/heartbeat") {
      this.heartbeats.push(await readBody());
      json(200, { ok: true, cap: this.cap });
      return;
    }

    // /api/bridge/runs/:id[/…]
    const match = /^\/api\/bridge\/runs\/([^/]+)(?:\/([a-z-]+))?$/.exec(url.pathname);
    if (!match) {
      res.writeHead(404).end();
      return;
    }
    const run = this.runs.get(match[1]);
    if (!run) {
      res.writeHead(404).end();
      return;
    }
    const sub = match[2];

    if (req.method === "GET" && !sub) {
      json(200, {
        runId: run.runId,
        ref: run.ref,
        title: run.title,
        state: run.state,
        lane: run.lane,
        helperKind: run.helperKind,
        queuePosition: run.queuePosition,
        project: run.project,
        ticket: run.ticket,
        briefBody: run.briefBody,
        question: run.question,
      });
      return;
    }

    const body = await readBody();

    if (req.method === "POST" && sub === "claim") {
      if (run.state !== "queued") {
        json(409, { ok: false, reason: "not-claimed" });
        return;
      }
      const claim = (body ?? {}) as { worktreePath?: string | null; branch?: string | null };
      run.state = "running";
      run.bridged = true;
      run.worktreePath = claim.worktreePath ?? null;
      run.branch = claim.branch ?? null;
      json(200, { ok: true });
      return;
    }

    if (req.method === "POST" && sub === "transition") {
      const t = (body ?? {}) as Record<string, unknown>;
      const apply = (from: RunState, to: RunState): boolean => {
        if (run.state !== from) return false;
        run.state = to;
        return true;
      };
      switch (t.to) {
        case "needs-input": {
          if (!apply("running", "needs-input")) return json(409, { ok: false });
          run.question = t.question as NeedsInputQuestion;
          return json(200, { ok: true });
        }
        case "review-ready": {
          if (!apply("running", "review-ready")) return json(409, { ok: false });
          run.diffStats = t.diffStats ?? null;
          run.diffPatch = typeof t.diffPatch === "string" ? t.diffPatch : null;
          return json(200, { ok: true });
        }
        case "failed": {
          const from: RunState = t.from === "review-ready" ? "review-ready" : "running";
          if (!apply(from, "failed")) return json(409, { ok: false });
          run.failureKind = String(t.failureKind ?? "");
          run.failureDetail = t.failureDetail ? String(t.failureDetail) : null;
          run.prUrl = typeof t.prUrl === "string" ? t.prUrl : run.prUrl;
          return json(200, { ok: true });
        }
        case "cancelled": {
          if (!apply("needs-input", "cancelled")) return json(409, { ok: false });
          return json(200, { ok: true });
        }
        case "shipped": {
          if (!apply("review-ready", "shipped")) return json(409, { ok: false });
          run.prUrl = typeof t.prUrl === "string" ? t.prUrl : null;
          run.mergeSha = typeof t.mergeSha === "string" ? t.mergeSha : null;
          return json(200, { ok: true });
        }
        default:
          return json(400, { ok: false });
      }
    }

    if (req.method === "POST" && sub === "stdout") {
      const chunks = ((body ?? {}) as { chunks?: Array<{ seq: number; content: string }> })
        .chunks;
      for (const chunk of chunks ?? []) {
        if (!run.stdout.has(chunk.seq)) run.stdout.set(chunk.seq, chunk.content);
      }
      json(200, { ok: true, inserted: chunks?.length ?? 0 });
      return;
    }

    if (req.method === "POST" && sub === "helper-result") {
      if (run.state !== "running" || run.lane !== "helper") {
        json(409, { ok: false, reason: "not-claimed" });
        return;
      }
      run.helperResult = body;
      run.state = "shipped";
      json(200, { ok: true });
      return;
    }

    res.writeHead(404).end();
  }
}

/** poll until the predicate holds (the daemon is asynchronous end-to-end). */
export async function waitFor(
  predicate: () => boolean,
  label: string,
  timeoutMs = 15_000,
): Promise<void> {
  const start = Date.now();
  for (;;) {
    if (predicate()) return;
    if (Date.now() - start > timeoutMs) throw new Error(`waitFor timed out: ${label}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}
