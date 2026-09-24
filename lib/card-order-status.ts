/**
 * Determines which upcoming/recent events already have a card ordered,
 * and returns the latest matching order's production status.
 *
 * Matches by eventId when present. Also matches by profileId for orders
 * placed in the current occasion window (covers orders started from the
 * profile page / email nudge links, which historically omitted eventId).
 */

export type CardOrderStatusValue =
  | 'pending'
  | 'processing'
  | 'written'
  | 'complete'
  | 'problem'
  | 'cancelled';

export type CardOrderRef = {
  eventId: string | null;
  profileId: string | null;
  createdAt: Date;
  status?: CardOrderStatusValue;
  sendDate?: string | null;
};

export type EventRef = {
  id: string;
  profileId: string;
  /** Days until (positive) or since (negative) the occasion */
  daysUntil: number;
};

export type EventCardOrder = {
  status: CardOrderStatusValue;
  sendDate: string | null;
};

/** How far before the occasion an order still counts toward it */
const WINDOW_DAYS_BEFORE = 90;
/** How far after the occasion an order still counts toward it */
const WINDOW_DAYS_AFTER = 7;

function findMatchingOrder(
  event: EventRef,
  orders: CardOrderRef[],
  now: number,
): CardOrderRef | undefined {
  const byEventId = orders
    .filter(o => o.eventId === event.id)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  if (byEventId.length > 0) return byEventId[0];

  // Approximate occurrence date from daysUntil relative to today
  const occurrenceMs = now + event.daysUntil * 24 * 60 * 60 * 1000;
  const windowStart = occurrenceMs - WINDOW_DAYS_BEFORE * 24 * 60 * 60 * 1000;
  const windowEnd = occurrenceMs + WINDOW_DAYS_AFTER * 24 * 60 * 60 * 1000;

  const byProfile = orders
    .filter(o => {
      if (o.profileId !== event.profileId) return false;
      const t = o.createdAt.getTime();
      return t >= windowStart && t <= windowEnd;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return byProfile[0];
}

export function eventIdsWithCardOrdered(
  events: EventRef[],
  orders: CardOrderRef[],
): Set<string> {
  return new Set(cardOrdersByEventId(events, orders).keys());
}

/** Map event id → latest matching non-cancelled card order status */
export function cardOrdersByEventId(
  events: EventRef[],
  orders: CardOrderRef[],
): Map<string, EventCardOrder> {
  const result = new Map<string, EventCardOrder>();
  if (events.length === 0 || orders.length === 0) return result;

  const now = Date.now();
  const activeOrders = orders.filter(o => o.status !== 'cancelled');

  for (const event of events) {
    const match = findMatchingOrder(event, activeOrders, now);
    if (!match) continue;
    result.set(event.id, {
      status: match.status ?? 'pending',
      sendDate: match.sendDate ?? null,
    });
  }

  return result;
}

export type CardOrderBadge = {
  label: string;
  /** Tailwind-friendly tone for the pill */
  tone: 'scheduled' | 'ordered' | 'progress' | 'mailed' | 'problem';
};

/** User-facing badge for dashboard / profile based on DB status + sendDate */
export function getCardOrderBadge(
  status: CardOrderStatusValue,
  sendDate: string | null | undefined,
): CardOrderBadge {
  if (status === 'complete') {
    return { label: 'Card Mailed', tone: 'mailed' };
  }
  if (status === 'problem') {
    return { label: 'Card Issue', tone: 'problem' };
  }
  if (status === 'cancelled') {
    return { label: 'Card Cancelled', tone: 'problem' };
  }
  if (sendDate) {
    const today = new Date().toISOString().slice(0, 10);
    if (sendDate > today) {
      return { label: 'Card Scheduled', tone: 'scheduled' };
    }
  }
  if (status === 'processing' || status === 'written') {
    return { label: 'In Production', tone: 'progress' };
  }
  return { label: 'Card Ordered', tone: 'ordered' };
}
