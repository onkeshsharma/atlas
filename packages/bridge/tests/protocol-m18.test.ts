/**
 * M18 — WorkOrder repoUrl round-trip in the daemon's parseWorkOrder.
 * Lives in the bridge package so the import is plain (no cross-package
 * tsconfig gymnastics) and is exercised independently of the app suite.
 */
import { describe, expect, it } from "vitest";

import { parseWorkOrder } from "../src/protocol.ts";

const RUN_ID = "11111111-2222-4333-8444-000000000018";

describe("WorkOrder — M18 repoUrl round-trip", () => {
  it("parseWorkOrder accepts repoUrl and preserves it", () => {
    const order = {
      runId: RUN_ID,
      ref: "R-500",
      title: "Test",
      state: "queued",
      lane: "owner",
      helperKind: null,
      queuePosition: 1,
      project: {
        id: "p1",
        name: "test",
        slug: "test",
        localPath: null,
        repoUrl: "https://github.com/test/repo",
      },
      ticket: null,
      briefBody: null,
      question: null,
    };
    const parsed = parseWorkOrder(order);
    expect(parsed).not.toBeNull();
    expect(parsed!.project.repoUrl).toBe("https://github.com/test/repo");
  });

  it("parseWorkOrder tolerates absent repoUrl (pre-M18 server response)", () => {
    const order = {
      runId: RUN_ID,
      ref: "R-500",
      title: "Test",
      state: "queued",
      lane: "owner",
      helperKind: null,
      queuePosition: 1,
      project: { id: "p1", name: "test", slug: "test", localPath: "/home/me/repo" },
      ticket: null,
      briefBody: null,
      question: null,
    };
    const parsed = parseWorkOrder(order);
    expect(parsed).not.toBeNull();
  });

  it("parseWorkOrder accepts repoUrl: null explicitly", () => {
    const order = {
      runId: RUN_ID,
      ref: "R-500",
      title: "Test",
      state: "queued",
      lane: "owner",
      helperKind: null,
      queuePosition: 1,
      project: { id: "p1", name: "test", slug: "test", localPath: "/home/me/repo", repoUrl: null },
      ticket: null,
      briefBody: null,
      question: null,
    };
    const parsed = parseWorkOrder(order);
    expect(parsed).not.toBeNull();
    expect(parsed!.project.repoUrl).toBeNull();
  });

  it("parseWorkOrder rejects invalid repoUrl type", () => {
    const order = {
      runId: RUN_ID,
      ref: "R-500",
      title: "Test",
      state: "queued",
      lane: "owner",
      helperKind: null,
      queuePosition: 1,
      project: { id: "p1", name: "test", slug: "test", localPath: null, repoUrl: 42 },
      ticket: null,
      briefBody: null,
      question: null,
    };
    const parsed = parseWorkOrder(order);
    expect(parsed).toBeNull();
  });
});
