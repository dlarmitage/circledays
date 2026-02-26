import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { cardPreferences } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { listHandwritingStyles, listStationery } from '@/lib/handwrite';

// GET /api/card-preferences — return user's card preferences + available styles/stationery
export async function GET() {
  try {
    const user = await requireAuth();
    const userId = user.id;

    const [prefs] = await db
      .select()
      .from(cardPreferences)
      .where(eq(cardPreferences.userId, userId));

    // Fetch available options from Handwrite.io (cached in production via Next.js fetch cache)
    let handwritingStyles: { id: string; name: string; preview?: string }[] = [];
    let stationeryOptions: { id: string; name: string; preview?: string }[] = [];

    try {
      [handwritingStyles, stationeryOptions] = await Promise.all([
        listHandwritingStyles(),
        listStationery(),
      ]);
    } catch (err) {
      // Non-fatal — return empty lists if Handwrite key not yet configured
      console.warn('Could not fetch Handwrite.io options:', err);
    }

    return NextResponse.json({
      preferences: prefs ?? { handwritingId: '', stationeryId: '' },
      handwritingStyles,
      stationeryOptions,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Card preferences fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch card preferences' }, { status: 500 });
  }
}

const prefsSchema = z.object({
  handwritingId: z.string(),
  stationeryId: z.string(),
});

// PUT /api/card-preferences — save user's card preferences
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const userId = user.id;
    const body = await request.json();
    const data = prefsSchema.parse(body);

    const [existing] = await db
      .select()
      .from(cardPreferences)
      .where(eq(cardPreferences.userId, userId));

    if (existing) {
      await db
        .update(cardPreferences)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(cardPreferences.userId, userId));
    } else {
      await db.insert(cardPreferences).values({ userId, ...data });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Card preferences save error:', error);
    return NextResponse.json({ error: 'Failed to save card preferences' }, { status: 500 });
  }
}
