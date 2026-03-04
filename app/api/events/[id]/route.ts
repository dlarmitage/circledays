import { NextRequest, NextResponse } from 'next/server';
import { db, events, profiles, connections } from '@/lib/db';
import { withAuthParams } from '@/lib/api-handler';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateEventSchema = z.object({
  type: z.enum(['birthday', 'anniversary', 'custom']).optional(),
  customLabel: z.string().nullable().optional(),
  date: z.string().optional(),
  recurring: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
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

export const PATCH = withAuthParams(async (req, user, params: { id: string }) => {
  const { id } = params;
  const body = await req.json();
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

  // Check permission: own profile, profile creator, connected, or admin
  const isProfileOwner = event.profile.linkedUserId === user.id;
  const isProfileCreator = event.profile.createdByUserId === user.id;
  const isEventCreator = event.event.createdByUserId === user.id;
  const isConnected = await isUserConnectedToProfile(user.id, event.profile.id);

  // Private events can only be edited by the event creator
  if (event.event.isPrivate && !isEventCreator && !user.isPlatformAdmin) {
    return NextResponse.json({ error: 'Forbidden - private event' }, { status: 403 });
  }

  if (!isProfileOwner && !isProfileCreator && !isConnected && !user.isPlatformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Update event
  // If type is birthday or anniversary, force recurring to true
  const effectiveType = data.type || event.event.type;
  const isRecurring = effectiveType !== 'custom' ? true : (data.recurring ?? event.event.recurring);

  // If making private and no creator set, assign current user as creator
  // This handles legacy events that don't have createdByUserId
  const shouldSetCreator = data.isPrivate && !event.event.createdByUserId;

  const [updatedEvent] = await db
    .update(events)
    .set({
      ...data,
      customLabel: effectiveType === 'custom' ? data.customLabel : null,
      recurring: isRecurring,
      ...(shouldSetCreator && { createdByUserId: user.id }),
    })
    .where(eq(events.id, id))
    .returning();

  return NextResponse.json({ event: updatedEvent });
}, 'update event');

export const DELETE = withAuthParams(async (req, user, params: { id: string }) => {
  const { id } = params;

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

  // Check permission: own profile, profile creator, connected, or admin
  const isProfileOwner = event.profile.linkedUserId === user.id;
  const isProfileCreator = event.profile.createdByUserId === user.id;
  const isEventCreator = event.event.createdByUserId === user.id;
  const isConnected = await isUserConnectedToProfile(user.id, event.profile.id);

  // Private events can only be deleted by the event creator
  if (event.event.isPrivate && !isEventCreator && !user.isPlatformAdmin) {
    return NextResponse.json({ error: 'Forbidden - private event' }, { status: 403 });
  }

  if (!isProfileOwner && !isProfileCreator && !isConnected && !user.isPlatformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delete event
  await db.delete(events).where(eq(events.id, id));

  return NextResponse.json({ success: true });
}, 'delete event');
