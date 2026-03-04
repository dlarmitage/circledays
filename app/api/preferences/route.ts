import { NextRequest, NextResponse } from 'next/server';
import { db, reminderPreferences } from '@/lib/db';
import { withAuth } from '@/lib/api-handler';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Get user's reminder preferences
export const GET = withAuth(async (req, user) => {
  const [prefs] = await db
    .select()
    .from(reminderPreferences)
    .where(eq(reminderPreferences.userId, user.id))
    .limit(1);

  if (!prefs) {
    // Create default preferences
    const [newPrefs] = await db
      .insert(reminderPreferences)
      .values({
        userId: user.id,
        defaultLeadDays: [0, 1, 7],
      })
      .returning();

    return NextResponse.json({ preferences: newPrefs });
  }

  return NextResponse.json({ preferences: prefs });
}, 'get preferences');

const updatePreferencesSchema = z.object({
  defaultLeadDays: z.array(z.number().min(0).max(30)),
});

// Update preferences
export const PUT = withAuth(async (req, user) => {
  const body = await req.json();
  const { defaultLeadDays } = updatePreferencesSchema.parse(body);

  // Upsert preferences
  const [existing] = await db
    .select()
    .from(reminderPreferences)
    .where(eq(reminderPreferences.userId, user.id))
    .limit(1);

  let prefs;

  if (existing) {
    [prefs] = await db
      .update(reminderPreferences)
      .set({ defaultLeadDays })
      .where(eq(reminderPreferences.userId, user.id))
      .returning();
  } else {
    [prefs] = await db
      .insert(reminderPreferences)
      .values({
        userId: user.id,
        defaultLeadDays,
      })
      .returning();
  }

  return NextResponse.json({ preferences: prefs });
}, 'update preferences');
