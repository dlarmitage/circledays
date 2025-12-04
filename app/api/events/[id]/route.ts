import { NextRequest, NextResponse } from 'next/server';
import { db, events, profiles, connections } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateEventSchema = z.object({
  type: z.enum(['birthday', 'anniversary', 'custom']).optional(),
  customLabel: z.string().nullable().optional(),
  date: z.string().optional(),
  recurring: z.boolean().optional(),
});

// Helper to check if user is connected to a profile
async function isUserConnectedToProfile(userId: string, profileId: string): Promise<boolean> {
  const [userProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.linkedUserId, userId))
    .limit(1);
  
  if (!userProfile) return false;
  
  const [profileA, profileB] = [userProfile.id, profileId].sort();
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
  
  return !!connection;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const data = updateEventSchema.parse(body);
    
    // Get event with profile
    const [event] = await db
      .select({
        event: events,
        profile: profiles,
      })
      .from(events)
      .innerJoin(profiles, eq(events.profileId, profiles.id))
      .where(eq(events.id, id))
      .limit(1);
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // Check permission: own profile, creator, connected, or admin
    const isOwn = event.profile.linkedUserId === user.id;
    const isCreator = event.profile.createdByUserId === user.id;
    const isConnected = await isUserConnectedToProfile(user.id, event.profile.id);
    
    if (!isOwn && !isCreator && !isConnected && !user.isPlatformAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Update event
    // If type is birthday or anniversary, force recurring to true
    const effectiveType = data.type || event.event.type;
    const isRecurring = effectiveType !== 'custom' ? true : (data.recurring ?? event.event.recurring);
    
    const [updatedEvent] = await db
      .update(events)
      .set({
        ...data,
        customLabel: effectiveType === 'custom' ? data.customLabel : null,
        recurring: isRecurring,
      })
      .where(eq(events.id, id))
      .returning();
    
    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error('Update event error:', error);
    
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
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    
    // Get event with profile
    const [event] = await db
      .select({
        event: events,
        profile: profiles,
      })
      .from(events)
      .innerJoin(profiles, eq(events.profileId, profiles.id))
      .where(eq(events.id, id))
      .limit(1);
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // Check permission: own profile, creator, connected, or admin
    const isOwn = event.profile.linkedUserId === user.id;
    const isCreator = event.profile.createdByUserId === user.id;
    const isConnected = await isUserConnectedToProfile(user.id, event.profile.id);
    
    if (!isOwn && !isCreator && !isConnected && !user.isPlatformAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Delete event
    await db.delete(events).where(eq(events.id, id));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}


