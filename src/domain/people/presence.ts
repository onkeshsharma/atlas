/**
 * M11 — per-person presence, derived (charter item 4).
 *
 * The derivation is M6's actors-active-today precedent, made
 * per-person: feed_events.actor is a display string ("you", "Engine",
 * "ada"), so presence = the newest feed row whose actor matches one of
 * the person's display identities. Atlas tracks no sockets and no
 * keepalives — this is honest activity-derived presence, and the
 * surfaces label it that way ("active today", "last active 2h ago"),
 * never "online now" (M:176's claim needs a liveness channel nobody
 * has; recorded deviation).
 *
 * Matching rule (table-driven tested): case-insensitive equality
 * against displayName, handle, email, and the email's local part —
 * plus "you" for the Owner (every Owner-action writer records actor
 * "you"; M6 seed precedent).
 */

export type PersonIdentity = {
  displayName: string;
  handle?: string | null;
  email?: string | null;
  isOwner?: boolean;
};

/** lowercase actor → newest event time, as queried by latestActorActivity(). */
export type ActorActivity = Map<string, Date>;

/** the candidate actor strings a person may have written feed rows as. */
export function actorCandidates(person: PersonIdentity): string[] {
  const out = new Set<string>();
  const add = (s: string | null | undefined) => {
    const v = s?.trim().toLowerCase();
    if (v) out.add(v);
  };
  add(person.displayName);
  add(person.handle);
  add(person.email);
  if (person.email?.includes("@")) add(person.email.split("@")[0]);
  if (person.isOwner) add("you");
  return [...out];
}

/** newest activity for a person across their identities, or null. */
export function lastActiveAt(person: PersonIdentity, activity: ActorActivity): Date | null {
  let newest: Date | null = null;
  for (const candidate of actorCandidates(person)) {
    const at = activity.get(candidate);
    if (at && (!newest || at > newest)) newest = at;
  }
  return newest;
}

/** the M6 presence bar: active = any feed row since local midnight. */
export function activeToday(
  person: PersonIdentity,
  activity: ActorActivity,
  dayStart: Date,
): boolean {
  const at = lastActiveAt(person, activity);
  return at !== null && at >= dayStart;
}

/** local midnight — the M6 presence window. */
export function todayStart(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}
