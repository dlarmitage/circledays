import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { db } from '@/lib/db';
import { cardOrders } from '@/lib/db/schema';
import { eq, and, notInArray } from 'drizzle-orm';
import { listOrders } from '@/lib/handwrytten';

// Map Handwrytten status strings to our enum values
function mapStatus(hwStatus: string): string | null {
  const s = hwStatus.toLowerCase();
  if (s === 'pending' || s === 'queued') return 'pending';
  if (s === 'processing' || s === 'in progress' || s === 'in_progress') return 'processing';
  if (s === 'written' || s === 'writing') return 'written';
  if (s === 'complete' || s === 'completed' || s === 'shipped' || s === 'mailed') return 'complete';
  if (s === 'problem' || s === 'error' || s === 'failed') return 'problem';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  return null;
}

// POST /api/handwritten-cards/sync — sync order statuses from Handwrytten
export const POST = withAuth(async (_req, user) => {
  const userId = user.id;

  // Get local orders that are still in progress (not terminal states)
  const localOrders = await db
    .select()
    .from(cardOrders)
    .where(
      and(
        eq(cardOrders.userId, userId),
        notInArray(cardOrders.status, ['complete', 'cancelled'])
      )
    );

  if (localOrders.length === 0) {
    return NextResponse.json({ synced: 0 });
  }

  // Fetch current statuses from Handwrytten
  let remoteOrders;
  try {
    remoteOrders = await listOrders();
  } catch (err) {
    console.warn('Handwrytten order sync failed:', err);
    return NextResponse.json({ synced: 0 });
  }

  // Build lookup by Handwrytten order ID
  const remoteMap = new Map(remoteOrders.map(o => [String(o.id), o]));

  let synced = 0;
  for (const local of localOrders) {
    if (!local.handwriteOrderId) continue;
    const remote = remoteMap.get(local.handwriteOrderId);
    if (!remote) continue;

    const mappedStatus = mapStatus(remote.status);

    // Convert Handwrytten date_send (MM/DD/YYYY) to YYYY-MM-DD
    let sendDate: string | null = null;
    if (remote.date_send) {
      const parts = remote.date_send.split('/');
      if (parts.length === 3) {
        sendDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
    }

    const statusChanged = mappedStatus && mappedStatus !== local.status;
    const sendDateChanged = sendDate && sendDate !== local.sendDate;

    if (!statusChanged && !sendDateChanged) continue;

    const updates: Record<string, unknown> = {};
    if (statusChanged) updates.status = mappedStatus;
    if (sendDateChanged) updates.sendDate = sendDate;

    await db
      .update(cardOrders)
      .set(updates as Partial<typeof local>)
      .where(eq(cardOrders.id, local.id));
    synced++;
  }

  return NextResponse.json({ synced });
}, 'sync card orders');
