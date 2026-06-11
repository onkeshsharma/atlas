/**
 * M14 — the doc-article registry shape. Every article the docs index
 * (EE) lists exists here with a real body — the charter's no-dead-rows
 * law is enforced by tests/m14-public.test.ts over this type.
 */
import type { ReactNode } from "react";

export type DocSectionName = "Getting started" | "Concepts" | "The register";

export type DocArticle = {
  slug: string;
  /** h1 — ends with a period (HH:73–75). */
  title: string;
  /** EE index-row label (no period). */
  indexTitle: string;
  section: DocSectionName;
  /** EE index-row sub line. */
  sub: string;
  lede: ReactNode;
  readMin: number;
  audience: string;
  /** real date — these articles were written 2026-06-12. */
  updated: string;
  /** anchors into the body; the template appends "Where to go next". */
  toc: { id: string; label: string }[];
  /** related slugs — "architecture" resolves to /docs/architecture. */
  related: string[];
  /** the rail's Source footer — the REAL documents this was written from. */
  provenance: ReactNode;
  body: ReactNode;
};
