/**
 * M14 — the docs registry: every article the index (EE) lists, with real
 * bodies. EE's mock 26-row catalogue is trimmed to what actually got
 * written rather than padded (charter item 3 — no dead rows); the
 * architecture deep-dive lives at its own route (/docs/architecture, PP)
 * and appears here as index metadata only.
 */
import { connectYourMachine } from "./connect-your-machine";
import { needsInputAndSteering } from "./needs-input-and-steering";
import { ownerAndCollaborator } from "./owner-and-collaborator";
import { sequenceHintsAndShipGroups } from "./sequence-hints-and-ship-groups";
import { theBridgeAndTheEngine } from "./the-bridge-and-the-engine";
import { theEditorialRegister } from "./the-editorial-register";
import { ticketsBriefsAndRuns } from "./tickets-briefs-and-runs";
import type { DocArticle, DocSectionName } from "./types";
import { welcomeToAtlas } from "./welcome-to-atlas";

export type { DocArticle } from "./types";

/** reading order. */
export const DOC_ARTICLES: DocArticle[] = [
  welcomeToAtlas,
  connectYourMachine,
  ownerAndCollaborator,
  ticketsBriefsAndRuns,
  theBridgeAndTheEngine,
  needsInputAndSteering,
  sequenceHintsAndShipGroups,
  theEditorialRegister,
];

export function articleBySlug(slug: string): DocArticle | undefined {
  return DOC_ARTICLES.find((a) => a.slug === slug);
}

/** the PP deep-dive's index metadata — its page is its own route. */
export const ARCHITECTURE_META = {
  slug: "architecture",
  indexTitle: "How Atlas actually works",
  sub: "The architecture deep-dive — five players, one command log",
  section: "Concepts" as DocSectionName,
  readMin: 9,
};

export function docHref(slug: string): string {
  return slug === ARCHITECTURE_META.slug ? "/docs/architecture" : `/docs/${slug}`;
}

/** index-row / related-row metadata for a slug (articles + architecture). */
export function docMeta(
  slug: string,
): { indexTitle: string; sub: string; section: DocSectionName; readMin: number; href: string } | undefined {
  if (slug === ARCHITECTURE_META.slug) {
    return { ...ARCHITECTURE_META, href: docHref(slug) };
  }
  const article = articleBySlug(slug);
  if (!article) return undefined;
  return {
    indexTitle: article.indexTitle,
    sub: article.sub,
    section: article.section,
    readMin: article.readMin,
    href: docHref(slug),
  };
}

export type DocsIndexSection = {
  label: DocSectionName;
  intro: string;
  slugs: string[];
};

/** the EE index, trimmed to reality (charter item 3). */
export const DOCS_INDEX: DocsIndexSection[] = [
  {
    label: "Getting started",
    intro: "Read this first. About three minutes.",
    slugs: ["welcome-to-atlas", "connect-your-machine"],
  },
  {
    label: "Concepts",
    intro: "The vocabulary — the same words the system itself uses.",
    slugs: [
      "owner-and-collaborator",
      "tickets-briefs-and-runs",
      "the-bridge-and-the-engine",
      "needs-input-and-steering",
      "sequence-hints-and-ship-groups",
      "architecture",
    ],
  },
  {
    label: "The register",
    intro: "Why Atlas looks the way it does.",
    slugs: ["the-editorial-register"],
  },
];
