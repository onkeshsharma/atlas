/**
 * M3 — dev-variants registry: URL key → vendored variant prototype.
 *
 * The 52 prototypes in `design/variants/` are the design source of truth
 * (master plan, locked decision #6) and are vendored BYTE-IDENTICAL —
 * DESIGN-CANON.md cites them by file:line. This registry is v2 code; the
 * variants themselves are never edited.
 *
 * Clean rewrite of the proven v1.3 pattern (read: atlas/app/dev-variants/
 * _registry.ts, T120). Routes are gated dev-only via
 * `ATLAS_DEV_VARIANTS_ENABLED=1` (set in .env.development; never in prod).
 */
import type { ComponentType } from "react";

import { VariantABrutalist } from "@/design/variants/variant-a-brutalist";
import { VariantAAEmail } from "@/design/variants/variant-aa-email";
import { VariantBFusion } from "@/design/variants/variant-b-fusion";
import { VariantBBAccount } from "@/design/variants/variant-bb-account";
import { VariantCEditorial } from "@/design/variants/variant-c-editorial";
import { VariantCCNotifs } from "@/design/variants/variant-cc-notifs";
import { VariantDEditorialCollapsed } from "@/design/variants/variant-d-editorial-collapsed";
import { VariantDDSignup } from "@/design/variants/variant-dd-signup";
import { VariantEEditorialFeedFirst } from "@/design/variants/variant-e-editorial-feed-first";
import { VariantEEDocs } from "@/design/variants/variant-ee-docs";
import { VariantFTicketDetail } from "@/design/variants/variant-f-ticket-detail";
import { VariantFFLanding } from "@/design/variants/variant-ff-landing";
import { VariantGKanban } from "@/design/variants/variant-g-kanban";
import { VariantGGWelcome } from "@/design/variants/variant-gg-welcome";
import { VariantHSettings } from "@/design/variants/variant-h-settings";
import { VariantHHDocPage } from "@/design/variants/variant-hh-docpage";
import { VariantITriage } from "@/design/variants/variant-i-triage";
import { VariantIIEmpty } from "@/design/variants/variant-ii-empty";
import { VariantJIngest } from "@/design/variants/variant-j-ingest";
import { VariantJJDelete } from "@/design/variants/variant-jj-delete";
import { VariantKJob } from "@/design/variants/variant-k-job";
import { VariantKKDiff } from "@/design/variants/variant-kk-diff";
import { VariantLSignIn } from "@/design/variants/variant-l-signin";
import { VariantLLSearch } from "@/design/variants/variant-ll-search";
import { VariantMMembers } from "@/design/variants/variant-m-members";
import { VariantMMStatus } from "@/design/variants/variant-mm-status";
import { VariantNBridges } from "@/design/variants/variant-n-bridges";
import { VariantNNChangelog } from "@/design/variants/variant-nn-changelog";
import { VariantOProject } from "@/design/variants/variant-o-project";
import { VariantOOInsights } from "@/design/variants/variant-oo-insights";
import { VariantPContext } from "@/design/variants/variant-p-context";
import { VariantPPArch } from "@/design/variants/variant-pp-arch";
import { VariantQSetup } from "@/design/variants/variant-q-setup";
import { VariantQQProfile } from "@/design/variants/variant-qq-profile";
import { VariantRNewProject } from "@/design/variants/variant-r-newproject";
import { VariantRREngineRun } from "@/design/variants/variant-rr-enginerun";
import { VariantSFileTicket } from "@/design/variants/variant-s-fileticket";
import { VariantSSOnboarding } from "@/design/variants/variant-ss-onboarding";
import { VariantTCollab } from "@/design/variants/variant-t-collab";
import { VariantTTAudit } from "@/design/variants/variant-tt-audit";
import { VariantUInvite } from "@/design/variants/variant-u-invite";
import { VariantUUCmdK } from "@/design/variants/variant-uu-cmdk";
import { VariantVShipped } from "@/design/variants/variant-v-shipped";
import { VariantVVCheatsheet } from "@/design/variants/variant-vv-cheatsheet";
import { VariantWBrief } from "@/design/variants/variant-w-brief";
import { VariantWWTrust } from "@/design/variants/variant-ww-trust";
import { VariantX404 } from "@/design/variants/variant-x-404";
import { VariantXXTokens } from "@/design/variants/variant-xx-tokens";
import { VariantYPalette } from "@/design/variants/variant-y-palette";
import { VariantYYDigest } from "@/design/variants/variant-yy-digest";
import { VariantZInbox } from "@/design/variants/variant-z-inbox";
import { VariantZZ500 } from "@/design/variants/variant-zz-500";

export type VariantEntry = {
  key: string;
  /** Index display name. Canon naming: Run (never Job), Today. (never dashboard). */
  name: string;
  Component: ComponentType;
};

export const VARIANTS: readonly VariantEntry[] = [
  { key: "a", name: "A — Brutalist (rejected register)", Component: VariantABrutalist },
  { key: "aa", name: "AA — Ship email", Component: VariantAAEmail },
  { key: "b", name: "B — Fusion (rejected register)", Component: VariantBFusion },
  { key: "bb", name: "BB — Account settings", Component: VariantBBAccount },
  { key: "c", name: "C — Editorial register (chosen)", Component: VariantCEditorial },
  { key: "cc", name: "CC — Notifications", Component: VariantCCNotifs },
  { key: "d", name: "D — Collapsed sidebar shell", Component: VariantDEditorialCollapsed },
  { key: "dd", name: "DD — Sign up", Component: VariantDDSignup },
  { key: "e", name: "E — Today, feed-first (spec)", Component: VariantEEditorialFeedFirst },
  { key: "ee", name: "EE — Docs index", Component: VariantEEDocs },
  { key: "f", name: "F — Ticket detail", Component: VariantFTicketDetail },
  { key: "ff", name: "FF — Public landing", Component: VariantFFLanding },
  { key: "g", name: "G — Kanban board", Component: VariantGKanban },
  { key: "gg", name: "GG — Welcome", Component: VariantGGWelcome },
  { key: "h", name: "H — Settings shell", Component: VariantHSettings },
  { key: "hh", name: "HH — Doc article", Component: VariantHHDocPage },
  { key: "i", name: "I — Triage flow", Component: VariantITriage },
  { key: "ii", name: "II — Empty states (meta-reference)", Component: VariantIIEmpty },
  { key: "j", name: "J — Ingest summary", Component: VariantJIngest },
  { key: "jj", name: "JJ — Delete-confirm modal", Component: VariantJJDelete },
  { key: "k", name: "K — Run detail, failed", Component: VariantKJob },
  { key: "kk", name: "KK — Diff viewer", Component: VariantKKDiff },
  { key: "l", name: "L — Sign in", Component: VariantLSignIn },
  { key: "ll", name: "LL — Full-page search", Component: VariantLLSearch },
  { key: "m", name: "M — Members", Component: VariantMMembers },
  { key: "mm", name: "MM — Status page", Component: VariantMMStatus },
  { key: "n", name: "N — Bridges", Component: VariantNBridges },
  { key: "nn", name: "NN — Changelog", Component: VariantNNChangelog },
  { key: "o", name: "O — Project landing", Component: VariantOProject },
  { key: "oo", name: "OO — Insights", Component: VariantOOInsights },
  { key: "p", name: "P — Context viewer", Component: VariantPContext },
  { key: "pp", name: "PP — Architecture page", Component: VariantPPArch },
  { key: "q", name: "Q — Setup wizard", Component: VariantQSetup },
  { key: "qq", name: "QQ — Profile", Component: VariantQQProfile },
  { key: "r", name: "R — New project", Component: VariantRNewProject },
  { key: "rr", name: "RR — Live Engine run", Component: VariantRREngineRun },
  { key: "s", name: "S — File a Ticket", Component: VariantSFileTicket },
  { key: "ss", name: "SS — Onboarding", Component: VariantSSOnboarding },
  { key: "t", name: "T — Collaborator Ticket view", Component: VariantTCollab },
  { key: "tt", name: "TT — Audit log", Component: VariantTTAudit },
  { key: "u", name: "U — Invite accept", Component: VariantUInvite },
  { key: "uu", name: "UU — Cmd-K palette", Component: VariantUUCmdK },
  { key: "v", name: "V — Shipped Run", Component: VariantVShipped },
  { key: "vv", name: "VV — Cheatsheet (meta-reference)", Component: VariantVVCheatsheet },
  { key: "w", name: "W — Brief composer", Component: VariantWBrief },
  { key: "ww", name: "WW — Trust circle", Component: VariantWWTrust },
  { key: "x", name: "X — 404", Component: VariantX404 },
  { key: "xx", name: "XX — API tokens", Component: VariantXXTokens },
  { key: "y", name: "Y — Palette (capped results)", Component: VariantYPalette },
  { key: "yy", name: "YY — Weekly digest email", Component: VariantYYDigest },
  { key: "z", name: "Z — Inbox", Component: VariantZInbox },
  { key: "zz", name: "ZZ — 500", Component: VariantZZ500 },
];

export function findVariant(key: string): VariantEntry | undefined {
  return VARIANTS.find((v) => v.key === key.toLowerCase());
}

/** Dev-only gate. The flag lives in .env.development — never in prod env. */
export function devVariantsEnabled(): boolean {
  return process.env.ATLAS_DEV_VARIANTS_ENABLED === "1";
}
