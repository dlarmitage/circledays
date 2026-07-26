/**
 * Determines which upcoming/recent events already have a card ordered.
 *
 * Matches by eventId when present. Also matches by profileId for orders
 * placed in the current occasion window (covers orders started from the
 * profile page / email nudge links, which historically omitted eventId).
 */

export type CardOrderRef = {
  eventId: string | null;
  profileId: string | null;
  createdAt: Date;
};

export type EventRef = {
  id: string;
  profileId: string;
  /** Days until (positive) or since (negative) the occasion */
  daysUntil: number;
};

/** How far before the occasion an order still counts toward it */
const WINDOW_DAYS_BEFORE = 90;
/** How far after the occasion an order still counts toward it */
const WINDOW_DAYS_AFTER = 7;

export function eventIdsWithCardOrdered(
  events: EventRef[],
  orders: CardOrderRef[],
): Set<string> {
  const ordered = new Set<string>();
  if (events.length === 0 || orders.length === 0) return ordered;

  const now = Date.now();

  for (const event of events) {
    const byEventId = orders.some(o => o.eventId === event.id);
    if (byEventId) {
      ordered.add(event.id);
      continue;
    }

    // Approximate occurrence date from daysUntil relative to today
    const occurrenceMs = now + event.daysUntil * 24 * 60 * 60 * 1000;
    const windowStart = occurrenceMs - WINDOW_DAYS_BEFORE * 24 * 60 * 60 * 1000;
    const windowEnd = occurrenceMs + WINDOW_DAYS_AFTER * 24 * 60 * 60 * 1000;

    const byProfile = orders.some(o => {
      if (o.profileId !== event.profileId) return false;
      const t = o.createdAt.getTime();
      return t >= windowStart && t <= windowEnd;
    });

    if (byProfile) ordered.add(event.id);
  }

  return ordered;
}
