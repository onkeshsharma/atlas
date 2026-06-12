/**
 * M12 — the typed result vocabulary shared by the Cmd-K palette and the
 * /search page (charter item 1). Serializable: the palette receives
 * these over GET /api/search.
 */

export type SearchResultType =
  | "ticket"
  | "run"
  | "project"
  | "doc"
  | "context-term"
  | "action"
  | "page";

/** LL:59–64's kind column + the v2 additions (Run, Action, Page). */
export const TYPE_LABEL: Record<SearchResultType, string> = {
  ticket: "Ticket",
  run: "Run",
  project: "Project",
  doc: "Doc",
  "context-term": "Context term",
  action: "Action",
  page: "Page",
};

export type SearchResult = {
  type: SearchResultType;
  /** display title — list-title scale on LL, palette row label. */
  title: string;
  /** a REAL route — /tickets/[ref], /runs/[ref], /docs/[slug], … */
  href: string;
  /** mono-meta line — "T-249 · acme-website · shipped". */
  meta: string;
  /** palette glyph column (UU's icon vocabulary; ▶ per §3.6/VV:61). */
  glyph: string;
  /** raw state word for the LL row dot (tickets + runs only). */
  state?: string;
  /** LL's italic match fragment (page only). */
  snippet?: string;
};

export type SearchGroup = {
  label: string;
  type: SearchResultType;
  items: SearchResult[];
};

export type SearchResponse = {
  query: string;
  groups: SearchGroup[];
  total: number;
};
