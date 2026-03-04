import { NextResponse } from 'next/server';
import { db, profiles, connections } from '@/lib/db';
import { withAuth } from '@/lib/api-handler';
import { eq, or, sql } from 'drizzle-orm';

// Get connections for a specific profile (for tree navigation drill-in)
export const GET = withAuth(async (req, user) => {
  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get('profileId');

  // Get user's profile
  const [userProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.linkedUserId, user.id))
    .limit(1);

  if (!userProfile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 400 });
  }

  // Get user's direct connection IDs (for marking isConnectedToUser)
  const userConnectionRows = await db
    .select()
    .from(connections)
    .where(
      or(
        eq(connections.profileAId, userProfile.id),
        eq(connections.profileBId, userProfile.id)
      )
    );

  const userConnectionIds = new Set<string>();
  userConnectionRows.forEach(conn => {
    if (conn.profileAId === userProfile.id) {
      userConnectionIds.add(conn.profileBId);
    } else {
      userConnectionIds.add(conn.profileAId);
    }
  });
  userConnectionIds.add(userProfile.id); // Include self

  // If no profileId specified, return user's connections
  const targetProfileId = profileId || userProfile.id;

  // Check if user has permission to view this profile's connections
  // (must be directly connected or viewing own connections)
  if (targetProfileId !== userProfile.id && !userConnectionIds.has(targetProfileId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get connections for the target profile
  const targetConnectionRows = await db
    .select()
    .from(connections)
    .where(
      or(
        eq(connections.profileAId, targetProfileId),
        eq(connections.profileBId, targetProfileId)
      )
    );

  // Get the profile IDs of target's connections
  const targetConnectionIds = targetConnectionRows.map(conn =>
    conn.profileAId === targetProfileId ? conn.profileBId : conn.profileAId
  );

  // Get profile data for these connections
  const connectionProfiles = targetConnectionIds.length > 0
    ? await db
        .select()
        .from(profiles)
        .where(
          sql`${profiles.id} IN (${sql.join(targetConnectionIds.map(id => sql`${id}`), sql`, `)})`
        )
    : [];

  // Get connection counts for each profile
  const allConnectionCounts = await db
    .select({
      profileAId: connections.profileAId,
      profileBId: connections.profileBId,
    })
    .from(connections);

  // Build a count map
  const countMap = new Map<string, number>();
  allConnectionCounts.forEach(conn => {
    countMap.set(conn.profileAId, (countMap.get(conn.profileAId) || 0) + 1);
    countMap.set(conn.profileBId, (countMap.get(conn.profileBId) || 0) + 1);
  });

  // Filter out private profiles not created by the current user
  const visibleProfiles = connectionProfiles.filter(
    profile => !profile.isPrivate || profile.createdByUserId === user.id
  );

  // Build response
  const result = visibleProfiles.map(profile => ({
    id: profile.id,
    name: profile.name,
    profilePicture: profile.profilePicture,
    connectionCount: countMap.get(profile.id) || 0,
    isConnectedToUser: userConnectionIds.has(profile.id),
    linkedUserId: profile.linkedUserId,
  }));

  // Also return user profile info
  const userProfileData = {
    id: userProfile.id,
    name: userProfile.name,
    profilePicture: userProfile.profilePicture,
    connectionCount: userConnectionIds.size - 1, // Exclude self
    isConnectedToUser: true,
  };

  return NextResponse.json({
    userProfile: userProfileData,
    connections: result,
  });
}, 'get network tree');
