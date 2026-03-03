import { NextResponse } from 'next/server';
import { db, profiles, connections, users } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq, or, and, sql, ne, notInArray, inArray, gt } from 'drizzle-orm';

// GET /api/discoveries — profiles created by connected users that I'm not connected to
export async function GET() {
  try {
    const user = await requireAuth();

    // 1. Get current user's profile
    const [userProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.linkedUserId, user.id))
      .limit(1);

    if (!userProfile) {
      return NextResponse.json({ discoveries: [] });
    }

    // 2. Get all profiles connected to the current user
    const myConnections = await db
      .select({ profileId: profiles.id })
      .from(connections)
      .innerJoin(
        profiles,
        or(
          sql`${connections.profileAId} = ${userProfile.id} AND ${profiles.id} = ${connections.profileBId}`,
          sql`${connections.profileBId} = ${userProfile.id} AND ${profiles.id} = ${connections.profileAId}`
        )
      )
      .where(
        or(
          eq(connections.profileAId, userProfile.id),
          eq(connections.profileBId, userProfile.id)
        )
      );

    const myConnectedProfileIds = myConnections.map(c => c.profileId);

    if (myConnectedProfileIds.length === 0) {
      return NextResponse.json({ discoveries: [] });
    }

    // 3. Among those connected profiles, find which ones are linked to real user accounts
    //    that have shareNewConnections enabled
    const connectedUsers = await db
      .select({
        userId: users.id,
        userName: users.name,
        profileId: profiles.id,
        profilePicture: profiles.profilePicture,
      })
      .from(profiles)
      .innerJoin(users, eq(profiles.linkedUserId, users.id))
      .where(
        and(
          inArray(profiles.id, myConnectedProfileIds),
          eq(users.shareNewConnections, true)
        )
      );

    if (connectedUsers.length === 0) {
      return NextResponse.json({ discoveries: [] });
    }

    const sharingUserIds = connectedUsers.map(u => u.userId);

    // Build a lookup: userId → { name, profilePicture }
    const userLookup = new Map(
      connectedUsers.map(u => [u.userId, { name: u.userName, profilePicture: u.profilePicture }])
    );

    // 4. Find profiles created by those users within the last 90 days
    //    that are NOT already connected to the current user and are NOT the current user's profile
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // IDs to exclude: my own profile + all profiles I'm already connected to
    const excludeIds = [userProfile.id, ...myConnectedProfileIds];

    const discoveredProfiles = await db
      .select()
      .from(profiles)
      .where(
        and(
          inArray(profiles.createdByUserId, sharingUserIds),
          notInArray(profiles.id, excludeIds),
          gt(profiles.createdAt, ninetyDaysAgo)
        )
      );

    // 5. Exclude private profiles — discoveries should never show private contacts
    const visibleProfiles = discoveredProfiles.filter(p => !p.isPrivate);

    // 6. Build response with "addedBy" context
    const discoveries = visibleProfiles.map(profile => ({
      profileId: profile.id,
      name: profile.name,
      profilePicture: profile.profilePicture,
      createdAt: profile.createdAt,
      addedBy: userLookup.get(profile.createdByUserId) || { name: 'Someone', profilePicture: null },
    }));

    return NextResponse.json({ discoveries });
  } catch (error) {
    console.error('Get discoveries error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get discoveries' },
      { status: 500 }
    );
  }
}
