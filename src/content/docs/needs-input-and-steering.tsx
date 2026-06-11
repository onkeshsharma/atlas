/**
 * M14 — "Needs Input & steering." — the cockpit's hero loop, written from
 * CONTEXT.md (the state's definition), canon §3.3 (its visual monopoly)
 * and M9's real answer/cancel executors.
 */
import { DocSection, Term } from "./article-kit";
import type { DocArticle } from "./types";

export const needsInputAndSteering: DocArticle = {
  slug: "needs-input-and-steering",
  title: "Needs Input & steering.",
  indexTitle: "Needs Input & steering",
  section: "Concepts",
  sub: "What happens when the Engine asks",
  lede: "The worst failure mode of agent work is a session quietly blocked on a question nobody saw. Atlas makes that state the loudest thing in the cockpit — and answerable from the browser.",
  readMin: 3,
  audience: "Owners",
  updated: "June 12, 2026",
  toc: [
    { id: "the-state", label: "The state" },
    { id: "answering", label: "Answering" },
    { id: "cancel", label: "Cancel" },
    { id: "the-scope", label: "The deliberate scope" },
  ],
  related: ["the-bridge-and-the-engine", "tickets-briefs-and-runs"],
  provenance: "CONTEXT.md + canon §3.3 + the M9 handoff",
  body: (
    <>
      <DocSection id="the-state" label="The state">
        <p>
          <Term>Needs Input</Term> is a first-class Run state: the Engine has
          blocked on a question or a permission prompt and is waiting for the
          Owner. The question itself rides up as a typed payload — what was
          asked, the options if there are any.
        </p>
        <p>
          In the cockpit it outranks everything. It is the only pulsing amber
          in any list, and it pins to the top of Today. as the urgent strip —
          by design, blocked work is impossible to not notice.
        </p>
      </DocSection>

      <DocSection id="answering" label="Answering">
        <p>
          You answer in the browser — on the strip or on the Run&rsquo;s own
          page. The answer is recorded against the Run, flows down through
          the Bridge to the waiting Engine, and the Run resumes. No terminal,
          no ssh, no &ldquo;let me get to my desk.&rdquo;
        </p>
      </DocSection>

      <DocSection id="cancel" label="Cancel">
        <p>
          The other steering verb. Cancelling from the cockpit stops the
          Engine session, records the Run as cancelled, and frees its queue
          slot. Runaway or wrong-headed work dies in one click — and because
          the cancel is recorded first, even an Engine that finishes a
          moment later loses cleanly to the record.
        </p>
      </DocSection>

      <DocSection id="the-scope" label="The deliberate scope">
        <p>
          v2 steering is exactly three verbs: <em>watch</em>, <em>cancel</em>,
          and <em>answer-when-asked</em>. Arbitrary mid-run message injection
          — talking to a working Engine that didn&rsquo;t ask — is explicitly
          deferred; the protocol was designed not to preclude it, and the
          docs will change when it ships.
        </p>
      </DocSection>
    </>
  ),
};
