/**
 * M13 — /dev-emails fixtures: the AA/YY mock content, verbatim, fed
 * through the REAL composers. Deterministic on purpose — captures and
 * the convergence loop diff chrome/typography against the variants, not
 * data noise. (AA's Carmen/JSON-export story: variant-aa-email.tsx:36–141;
 * YY's Priya/week-19 story: variant-yy-digest.tsx:25–210.)
 */
import type { ComposedEmail } from "@/src/domain/notifier/compose-ship";
import { composeShipEmail } from "@/src/domain/notifier/compose-ship";
import { composeDigestEmail } from "@/src/domain/notifier/compose-digest";

export function shipFixture(): ComposedEmail {
  return composeShipEmail({
    recipientName: "Carmen",
    recipientEmail: "carmen@acme.io",
    ownerName: "Onkesh",
    projectName: "acme-website",
    ticketRef: "T-249",
    ticketTitle: "Add JSON export",
    filedAgo: "3 days ago",
    prUrl: "https://github.com/acme/website/pull/142",
    diff: {
      filesChanged: 3,
      insertions: 184,
      deletions: 12,
      files: [
        { path: "src/export/json.ts", insertions: 121, deletions: 0 },
        { path: "src/export/index.ts", insertions: 41, deletions: 8 },
        { path: "src/ui/ExportMenu.tsx", insertions: 22, deletions: 4 },
      ],
    },
    appUrl: "https://atlas.example",
    replyToOwner: true,
    fromAddress: "ship@atlas.example",
  });
}

export function digestFixture(): ComposedEmail {
  return composeDigestEmail({
    recipientName: "Priya",
    recipientEmail: "priya@example.in",
    ownerName: "Onkesh",
    projectNames: ["atlas-internal"],
    windowLabel: "Week 19 · May 6 → 12",
    ships: [
      {
        ticketRef: "T-142",
        title: "Timezone crash on signup is fixed.",
        body: "The missing-header path now falls back to UTC. Your reproduction from Friday works correctly now.",
        meta: "Ticket T-142 · shipped Tue · PR ↗",
        fromYou: true,
      },
      {
        ticketRef: "T-141",
        title: "New OG image on the marketing landing.",
        body: "Search-shareable image now reflects the v1.2 dashboard. Sam will sleep better.",
        meta: "Ticket T-141 · shipped Mon",
        fromYou: false,
      },
      {
        ticketRef: "T-138",
        title: "Brief drafter is 2× faster.",
        body: "Helper Run now caches CONTEXT.md across runs. New Tickets get a Brief in ~3s instead of ~7s.",
        meta: "Ticket T-138 · shipped Mon",
        fromYou: false,
      },
      {
        ticketRef: "T-135",
        title: "Bridge offline banner no longer flashes.",
        body: "Race condition between initial load and first heartbeat ping is gone.",
        meta: "Ticket T-135 · shipped Mon",
        fromYou: false,
      },
    ],
    openedCount: 2,
    inReview: [{ ticketRef: "T-143", title: "Add “mark as not-mine” on Ticket lists" }],
    appUrl: "https://atlas.example",
    fromAddress: "hello@atlas.example",
  });
}
