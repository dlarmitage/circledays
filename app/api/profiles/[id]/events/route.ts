import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, events, connections } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const createEventSchema = z.object({
  type: z.enum(['birthday', 'anniversary', 'custom']),
  customLabel: z.string().optional(),
  date: z.string(), // ISO date string
  recurring: z.boolean().optional(), // default true, false for one-time events
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: profileId } = await params;
    const body = await request.json();
    const data = createEventSchema.parse(body);
    
    // Get user's profile
    const [userProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.linkedUserId, user.id))
      .limit(1);
    
    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 400 });
    }
    
    // Get target profile
    const [targetProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);
    
    if (!targetProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    // Check permission: must be connected or own profile or creator
    const isOwn = targetProfile.linkedUserId === user.id;
    const isCreator = targetProfile.createdByUserId === user.id;
    
    let isConnected = false;
    if (!isOwn && !isCreator) {
      const [profileA, profileB] = [userProfile.id, targetProfile.id].sort();
      const [connection] = await db
        .select()
        .from(connections)
        .where(
          and(
            eq(connections.profileAId, profileA),
            eq(connections.profileBId, profileB)
          )
        )
        .limit(1);
      isConnected = !!connection;
    }
    
    if (!isOwn && !isCreator && !isConnected && !user.isPlatformAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Create event
    // Birthdays and anniversaries are always recurring, custom can be either
    const isRecurring = data.type !== 'custom' ? true : (data.recurring ?? true);
    
    const [newEvent] = await db
      .insert(events)
      .values({
        profileId,
        type: data.type,
        customLabel: data.type === 'custom' ? data.customLabel : null,
        date: data.date,
        recurring: isRecurring,
      })
      .returning();
    
    return NextResponse.json({ event: newEvent });
  } catch (error) {
    console.error('Create event error:', error);
    
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
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}


