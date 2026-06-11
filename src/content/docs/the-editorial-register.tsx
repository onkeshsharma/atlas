/**
 * M14 — "The editorial register." — why Atlas looks the way it does,
 * written from DESIGN-CANON.md (the ten moves, §1.1's one-color-one-meaning
 * law, the canon→kit→surfaces pipeline) for the reader who noticed.
 */
import { DocSection, Term } from "./article-kit";
import type { DocArticle } from "./types";

export const theEditorialRegister: DocArticle = {
  slug: "the-editorial-register",
  title: "The editorial register.",
  indexTitle: "The editorial register",
  section: "The register",
  sub: "Why Atlas looks like a magazine, not a dashboard",
  lede: "Atlas's design language is called the editorial register — warm paper, dividers instead of cards, one amber accent. It isn't a theme; it's a discipline with a signed law behind it.",
  readMin: 3,
  audience: "The curious",
  updated: "June 12, 2026",
  toc: [
    { id: "why-it-looks-like-this", label: "Why it looks like this" },
    { id: "the-moves", label: "The signature moves" },
    { id: "one-color-one-meaning", label: "One color, one meaning" },
    { id: "the-discipline", label: "The discipline" },
  ],
  related: ["welcome-to-atlas"],
  provenance: "DESIGN-CANON.md — signed as law, June 11, 2026",
  body: (
    <>
      <DocSection id="why-it-looks-like-this" label="Why it looks like this">
        <p>
          A cockpit you live in all day should read like a well-set page, not
          a control panel shouting in eight colors. The register optimizes
          for calm: generous spacing, typographic hierarchy doing the work
          chrome usually does, and motion reserved for things that are
          genuinely happening right now.
        </p>
      </DocSection>

      <DocSection id="the-moves" label="The signature moves">
        <p>
          The constitution is ten moves, used everywhere: the{" "}
          <Term>hero sentence</Term> that summarizes a page in prose; the{" "}
          <Term>day-stamp</Term>; period-ended titles (<em>Today.</em>);{" "}
          <Term>dividers, not cards</Term> for every collection; the
          asymmetric content-and-rail grid; rare decorative mono for labels
          and meta; <Term>amber as the brand&rsquo;s one accent</Term>;
          print-generous spacing; the quiet <span className="font-mono text-sm">→</span>{" "}
          affordance; and a warm paper wash behind it all.
        </p>
      </DocSection>

      <DocSection id="one-color-one-meaning" label="One color, one meaning">
        <p>
          Emerald means shipped, live, healthy. Rose means failed or
          destructive. Amber means <em>needs you</em> — and it is kept
          scarce so that it can mean it. Amber is never success; emerald is
          never brand. The only pulsing amber in any list is a Run waiting
          on your input, which is exactly why you can&rsquo;t miss one.
        </p>
        <p>
          There are no exclamation marks anywhere in the product&rsquo;s
          copy. Good news is italic, not celebratory. Quiet is a feature.
        </p>
      </DocSection>

      <DocSection id="the-discipline" label="The discipline">
        <p>
          v2 inverted the usual order: design law first, then components,
          then pages. Fifty-two prototype surfaces are vendored into the
          repo as the spec; a signed <Term>design canon</Term> resolves
          every inconsistency between them once, with cited evidence; 28
          primitives were extracted from the prototypes before any page was
          built; and a mechanical tripwire fails any commit whose classes
          drift from the law. Pages are ported from their prototype&rsquo;s
          actual markup — near-pixel, by rule.
        </p>
      </DocSection>
    </>
  ),
};
