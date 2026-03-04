import { NextResponse } from 'next/server';
import { db, profiles, connections, events } from '@/lib/db';
import { withAuth } from '@/lib/api-handler';
import { eq, or, sql } from 'drizzle-orm';

// Get events for a specific month (for calendar view)
export const GET = withAuth(async (req, user) => {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

  // Get user's profile
  const [userProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.linkedUserId, user.id))
    .limit(1);

  if (!userProfile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 400 });
  }

  // Get user's connection IDs (including self)
  const connectionRows = await db
    .select()
    .from(connections)
    .where(
      or(
        eq(connections.profileAId, userProfile.id),
        eq(connections.profileBId, userProfile.id)
      )
    );

  const connectedProfileIds = new Set<string>([userProfile.id]);
  connectionRows.forEach(conn => {
    if (conn.profileAId === userProfile.id) {
      connectedProfileIds.add(conn.profileBId);
    } else {
      connectedProfileIds.add(conn.profileAId);
    }
  });

  const profileIdArray = Array.from(connectedProfileIds);

  // Get all events for connected profiles
  const allEventsRaw = profileIdArray.length > 0
    ? await db
        .select({
          event: events,
          profile: profiles,
        })
        .from(events)
        .innerJoin(profiles, eq(events.profileId, profiles.id))
        .where(
          sql`${events.profileId} IN (${sql.join(profileIdArray.map(id => sql`${id}`), sql`, `)})`
        )
    : [];

  // Filter out private profiles and private events unless current user created them
  const allEvents = allEventsRaw.filter(({ event, profile }) =>
    (!profile.isPrivate || profile.createdByUserId === user.id) &&
    (!event.isPrivate || event.createdByUserId === user.id)
  );

  // Filter events that occur in the requested month
  // For recurring events, check if the month/day falls in the requested month
  // For non-recurring events, check the exact year/month
  const monthEvents: {
    date: string; // YYYY-MM-DD
    events: {
      id: string;
      type: string;
      name: string | null;
      profileId: string;
      profileName: string;
      profilePicture: string | null;
      isRecurring: boolean;
      originalDate: string;
      isPrivate: boolean;
    }[];
  }[] = [];

  // Build a map of date -> events
  const dateEventsMap = new Map<string, typeof monthEvents[0]['events']>();

  // Days in the requested month
  const daysInMonth = new Date(year, month, 0).getDate();

  allEvents.forEach(({ event, profile }) => {
    const eventDate = new Date(event.date);
    const eventMonth = eventDate.getMonth() + 1; // 1-indexed
    const eventDay = eventDate.getDate();
    const eventYear = eventDate.getFullYear();

    // Check if this event falls in the requested month
    let matchesMonth = false;
    const displayDay = eventDay;

    if (event.recurring) {
      // Recurring: show if month matches (any year)
      matchesMonth = eventMonth === month;
    } else {
      // Non-recurring: show if exact year and month match
      matchesMonth = eventYear === year && eventMonth === month;
    }

    if (matchesMonth && displayDay <= daysInMonth) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(displayDay).padStart(2, '0')}`;

      if (!dateEventsMap.has(dateKey)) {
        dateEventsMap.set(dateKey, []);
      }

      dateEventsMap.get(dateKey)!.push({
        id: event.id,
        type: event.type,
        name: event.customLabel,
        profileId: profile.id,
        profileName: profile.name,
        profilePicture: profile.profilePicture,
        isRecurring: event.recurring,
        originalDate: event.date,
        isPrivate: event.isPrivate,
      });
    }
  });

  // Convert map to sorted array
  const sortedDates = Array.from(dateEventsMap.keys()).sort();
  sortedDates.forEach(date => {
    monthEvents.push({
      date,
      events: dateEventsMap.get(date)!,
    });
  });

  return NextResponse.json({
    year,
    month,
    events: monthEvents,
  });
}, 'get calendar events');
