import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { cardPreferences } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { listCategories, listFonts } from '@/lib/handwrytten';

// GET /api/card-preferences — return user's card preferences + available categories/fonts
export async function GET() {
  try {
    const user = await requireAuth();
    const userId = user.id;

    const [prefs] = await db
      .select()
      .from(cardPreferences)
      .where(eq(cardPreferences.userId, userId));

    // Fetch available options from Handwrytten
    let categories: Awaited<ReturnType<typeof listCategories>> = [];
    let fonts: Awaited<ReturnType<typeof listFonts>> = [];

    try {
      [categories, fonts] = await Promise.all([
        listCategories(),
        listFonts(),
      ]);
      // Filter out "All Categories" — it has no cards when queried directly
      categories = categories.filter(c => c.name.toLowerCase() !== 'all categories');
    } catch (err) {
      // Non-fatal — return empty lists if Handwrytten credentials not yet configured
      console.warn('Could not fetch Handwrytten options:', err);
    }

    return NextResponse.json({
      preferences: prefs
        ? {
            fontId: prefs.fontId,
            cardId: prefs.cardId,
            signOff: prefs.signOff,
            senderName: prefs.senderName,
            senderAddress1: prefs.senderAddress1,
            senderCity: prefs.senderCity,
            senderState: prefs.senderState,
            senderZip: prefs.senderZip,
          }
        : null,
      categories,
      fonts,
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
  fontId: z.string().optional(),
  cardId: z.string().optional(),
  signOff: z.string().optional(),
  senderName: z.string().optional(),
  senderAddress1: z.string().optional(),
  senderCity: z.string().optional(),
  senderState: z.string().optional(),
  senderZip: z.string().optional(),
});

// PUT /api/card-preferences — save user's card preferences (partial update)
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const userId = user.id;
    const body = await request.json();
    const data = prefsSchema.parse(body);

    // Only include fields that were actually sent
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.fontId !== undefined) updates.fontId = data.fontId;
    if (data.cardId !== undefined) updates.cardId = data.cardId;
    if (data.signOff !== undefined) updates.signOff = data.signOff;
    if (data.senderName !== undefined) updates.senderName = data.senderName;
    if (data.senderAddress1 !== undefined) updates.senderAddress1 = data.senderAddress1;
    if (data.senderCity !== undefined) updates.senderCity = data.senderCity;
    if (data.senderState !== undefined) updates.senderState = data.senderState;
    if (data.senderZip !== undefined) updates.senderZip = data.senderZip;

    const [existing] = await db
      .select()
      .from(cardPreferences)
      .where(eq(cardPreferences.userId, userId));

    if (existing) {
      await db
        .update(cardPreferences)
        .set(updates)
        .where(eq(cardPreferences.userId, userId));
    } else {
      await db.insert(cardPreferences).values({
        userId,
        fontId: data.fontId ?? '',
        cardId: data.cardId ?? '',
        signOff: data.signOff,
        senderName: data.senderName,
        senderAddress1: data.senderAddress1,
        senderCity: data.senderCity,
        senderState: data.senderState,
        senderZip: data.senderZip,
      });
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
