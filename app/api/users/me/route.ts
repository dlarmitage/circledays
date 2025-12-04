import { NextRequest, NextResponse } from 'next/server';
import { db, users, profiles } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().optional(),
  mobile: z.string().nullable().optional(),
  notificationChannel: z.enum(['email', 'sms', 'both']).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = updateUserSchema.parse(body);
    
    // Update user
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, user.id))
      .returning();
    
    // If name changed, update linked profile too
    if (data.name) {
      await db
        .update(profiles)
        .set({ name: data.name })
        .where(eq(profiles.linkedUserId, user.id));
    }
    
    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    
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
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const keepProfile = searchParams.get('keepProfile') === 'true';
    
    if (keepProfile) {
      // Unlink user from profile but keep the profile
      await db
        .update(profiles)
        .set({ linkedUserId: null })
        .where(eq(profiles.linkedUserId, user.id));
    }
    // If not keeping profile, cascade delete will handle it
    
    // Delete user (cascades to most related data)
    await db.delete(users).where(eq(users.id, user.id));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}


