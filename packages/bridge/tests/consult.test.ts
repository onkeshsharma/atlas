import { describe, expect, it } from "vitest";

import { fakeConsultVerdict } from "../src/engine/consult.ts";
import { parseBridgeEvent } from "../src/protocol.ts";

describe("parseBridgeEvent — consult-ask (ADR-0007 Phase 2)", () => {
  it("accepts a well-formed consult-ask", () => {
    const e = parseBridgeEvent({
      type: "consult-ask",
      cursor: 5,
      runId: "r1",
      prompt: { system: "s", user: "u" },
      repoAware: true,
    });
    expect(e?.type).toBe("consult-ask");
  });

  it("rejects a malformed prompt or a missing repoAware", () => {
    expect(
      parseBridgeEvent({ type: "consult-ask", cursor: 5, runId: "r1", prompt: { system: "s" }, repoAware: true }),
    ).toBeNull();
    expect(
      parseBridgeEvent({ type: "consult-ask", cursor: 5, runId: "r1", prompt: { system: "s", user: "u" } }),
    ).toBeNull();
  });
});

describe("fakeConsultVerdict", () => {
  it("picks the first offered option", () => {
    const raw = fakeConsultVerdict({ system: "x", user: 'Options: "migrate", "drop"' });
    expect(JSON.parse(raw).choice).toBe("migrate");
  });
  it("answers free-text when no options were offered", () => {
    const raw = fakeConsultVerdict({ system: "x", user: "What index should we add?" });
    expect(JSON.parse(raw).answer).toBe("proceed");
  });
});
