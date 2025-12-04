import { NextRequest, NextResponse } from 'next/server';
import { db, reminderPreferences } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Get user's reminder preferences
export async function GET() {
  try {
    const user = await requireAuth();
    
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
  } catch (error) {
    console.error('Get preferences error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to get preferences' },
      { status: 500 }
    );
  }
}

const updatePreferencesSchema = z.object({
  defaultLeadDays: z.array(z.number().min(0).max(30)),
});

// Update preferences
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
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
  } catch (error) {
    console.error('Update preferences error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

