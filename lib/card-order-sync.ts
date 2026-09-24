/**
 * Sync local card_orders.status from Handwrytten.
 * Used by the authenticated sync route and the hourly cron.
 */

import { db } from '@/lib/db';
import { cardOrders } from '@/lib/db/schema';
import { eq, and, notInArray } from 'drizzle-orm';
import { listOrders, getOrder } from '@/lib/handwrytten';

export type CardOrderStatusValue =
  | 'pending'
  | 'processing'
  | 'written'
  | 'complete'
  | 'problem'
  | 'cancelled';

/** Map Handwrytten status strings to our enum values */
export function mapHandwryttenStatus(hwStatus: string): CardOrderStatusValue | null {
  const s = hwStatus.toLowerCase().trim().replace(/[\s-]+/g, '_');

  if (
    s === 'pending' ||
    s === 'queued' ||
    s === 'suspended' ||
    s === 'paid' ||
    s === 'scheduled' ||
    s === 'new'
  ) {
    return 'pending';
  }
  if (
    s === 'processing' ||
    s === 'in_progress' ||
    s === 'in_work' ||
    s === 'mm_in_work' ||
    s === 'printing' ||
    s === 'producing'
  ) {
    return 'processing';
  }
  if (s === 'written' || s === 'writing' || s === 'handwriting') {
    return 'written';
  }
  if (
    s === 'complete' ||
    s === 'completed' ||
    s === 'shipped' ||
    s === 'mailed' ||
    s === 'sent' ||
    s === 'delivered' ||
    s === 'fulfilled'
  ) {
    return 'complete';
  }
  if (s === 'problem' || s === 'error' || s === 'failed' || s === 'rejected') {
    return 'problem';
  }
  if (s === 'cancelled' || s === 'canceled') {
    return 'cancelled';
  }
  return null;
}

export type SyncResult = {
  synced: number;
  checked: number;
  unmapped: string[];
};

/**
 * Sync in-progress orders for a single user (or all users when userId is omitted).
 */
export async function syncCardOrderStatuses(userId?: string): Promise<SyncResult> {
  const localOrders = await db
    .select()
    .from(cardOrders)
    .where(
      userId
        ? and(
            eq(cardOrders.userId, userId),
            notInArray(cardOrders.status, ['complete', 'cancelled'])
          )
        : notInArray(cardOrders.status, ['complete', 'cancelled'])
    );

  if (localOrders.length === 0) {
    return { synced: 0, checked: 0, unmapped: [] };
  }

  let remoteMap = new Map<string, { status: string }>();
  try {
    const remoteOrders = await listOrders();
    remoteMap = new Map(remoteOrders.map(o => [String(o.id), o]));
  } catch (err) {
    console.warn('Handwrytten listOrders failed during sync, falling back to per-order fetch:', err);
  }

  const unmapped = new Set<string>();
  let synced = 0;

  for (const local of localOrders) {
    if (!local.handwriteOrderId) continue;

    let remote = remoteMap.get(local.handwriteOrderId);
    if (!remote) {
      // List endpoints can miss older/scheduled orders — fetch individually
      try {
        const detail = await getOrder(local.handwriteOrderId);
        if (detail) remote = detail;
      } catch (err) {
        console.warn(`Handwrytten getOrder(${local.handwriteOrderId}) failed:`, err);
        continue;
      }
    }
    if (!remote) continue;

    const mappedStatus = mapHandwryttenStatus(remote.status);
    if (!mappedStatus) {
      unmapped.add(remote.status);
      console.warn(
        `Unmapped Handwrytten status "${remote.status}" for order ${local.handwriteOrderId}`
      );
      continue;
    }
    if (mappedStatus === local.status) continue;

    await db
      .update(cardOrders)
      .set({ status: mappedStatus })
      .where(eq(cardOrders.id, local.id));
    synced++;
  }

  return {
    synced,
    checked: localOrders.length,
    unmapped: [...unmapped],
  };
}
