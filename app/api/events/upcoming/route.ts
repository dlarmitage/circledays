import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, connections, events } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq, or, and, sql } from 'drizzle-orm';
import { daysUntil, calculateAge } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    
    // Get user's profile
    const [userProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.linkedUserId, user.id))
      .limit(1);
    
    if (!userProfile) {
      return NextResponse.json({ events: [] });
    }
    
    // Get all connected profile IDs
    const connectedProfiles = await db
      .select({
        profileId: sql<string>`
          CASE 
            WHEN ${connections.profileAId} = ${userProfile.id} THEN ${connections.profileBId}
            ELSE ${connections.profileAId}
          END
        `.as('profile_id'),
      })
      .from(connections)
      .where(
        or(
          eq(connections.profileAId, userProfile.id),
          eq(connections.profileBId, userProfile.id)
        )
      );
    
    const connectedIds = connectedProfiles.map(c => c.profileId);
    
    if (connectedIds.length === 0) {
      return NextResponse.json({ events: [] });
    }
    
    // Get all events for connected profiles (excluding own profile)
    const allEventsRaw = await db
      .select({
        event: events,
        profile: profiles,
      })
      .from(events)
      .innerJoin(profiles, eq(events.profileId, profiles.id))
      .where(
        and(
          sql`${events.profileId} IN (${sql.join(connectedIds.map(id => sql`${id}`), sql`, `)})`,
          sql`${profiles.id} != ${userProfile.id}`
        )
      );
    
    // Filter out private events unless current user created them
    const allEvents = allEventsRaw.filter(({ event }) => 
      !event.isPrivate || event.createdByUserId === user.id
    );
    
    // Calculate days until each event and filter
    const upcomingEvents = allEvents
      .map(({ event, profile }) => {
        const daysUntilEvent = daysUntil(event.date);
        const rawAge = event.type === 'birthday' ? calculateAge(event.date) : null;
        const age = rawAge !== null ? rawAge + 1 : undefined;
        
        return {
          id: event.id,
          profileId: profile.id,
          profileName: profile.name,
          profilePicture: profile.profilePicture,
          type: event.type,
          customLabel: event.customLabel,
          date: event.date,
          daysUntil: daysUntilEvent,
          age,
          isPrivate: event.isPrivate,
        };
      })
      .filter(e => e.daysUntil >= 0 && e.daysUntil <= days)
      .sort((a, b) => a.daysUntil - b.daysUntil);
    
    return NextResponse.json({ events: upcomingEvents });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to get events' },
      { status: 500 }
    );
  }
}


