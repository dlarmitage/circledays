import { NextRequest, NextResponse } from 'next/server';
import { syncCardOrderStatuses } from '@/lib/card-order-sync';

/**
 * Hourly cron: pull production status from Handwrytten for all in-progress card orders.
 * Status sync previously only ran when a user opened /cards, so dashboard badges stayed stuck.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncCardOrderStatuses();
    console.log(
      `Card order sync cron: checked=${result.checked} synced=${result.synced}` +
        (result.unmapped.length ? ` unmapped=[${result.unmapped.join(',')}]` : '')
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error('Card order sync cron error:', error);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}
