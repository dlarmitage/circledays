import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, connections, events } from '@/lib/db';
import { withAuth } from '@/lib/api-handler';
import { eq, or, and, sql } from 'drizzle-orm';
import { daysUntil, daysSinceOccurrence, turningAge } from '@/lib/utils';

export const GET = withAuth(async (req, user) => {
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get('days') || '30', 10);
  const pastDays = parseInt(searchParams.get('pastDays') || '0', 10);

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

  // Filter out private profiles and private events unless current user created them
  const allEvents = allEventsRaw.filter(({ event, profile }) =>
    (!profile.isPrivate || profile.createdByUserId === user.id) &&
    (!event.isPrivate || event.createdByUserId === user.id)
  );

  // Calculate days until each event and filter
  const enrichedEvents = allEvents.map(({ event, profile }) => {
    const daysUntilEvent = daysUntil(event.date);
    const age = event.type === 'birthday' ? turningAge(event.date) ?? undefined : undefined;

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
      _rawDate: event.date, // used for past-event calculation below
    };
  });

  // Upcoming events (today + future)
  const upcomingEvents = enrichedEvents
    .filter(e => e.daysUntil >= 0 && e.daysUntil <= days)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // Recently passed events (optional)
  let recentEvents: typeof upcomingEvents = [];
  if (pastDays > 0) {
    recentEvents = enrichedEvents
      .map(e => {
        const daysSince = daysSinceOccurrence(e._rawDate);
        if (daysSince > 0 && daysSince <= pastDays) {
          return { ...e, daysUntil: -daysSince };
        }
        return null;
      })
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .sort((a, b) => b.daysUntil - a.daysUntil); // most recent first (-1 before -5)
  }

  // Strip internal field before sending
  const allResults = [...upcomingEvents, ...recentEvents].map(({ _rawDate, ...rest }) => rest);

  return NextResponse.json({ events: allResults });
}, 'get upcoming events');
