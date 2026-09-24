import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { syncCardOrderStatuses } from '@/lib/card-order-sync';

// POST /api/handwritten-cards/sync — sync order statuses from Handwrytten
export const POST = withAuth(async (_req, user) => {
  try {
    const result = await syncCardOrderStatuses(user.id);
    return NextResponse.json(result);
  } catch (err) {
    console.warn('Handwrytten order sync failed:', err);
    return NextResponse.json({ synced: 0, checked: 0, unmapped: [] });
  }
}, 'sync card orders');
