import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, connections } from '@/lib/db';
import { withAuth } from '@/lib/api-handler';
import { eq, or } from 'drizzle-orm';

// GET - Get all profiles in the system (admin only)
export const GET = withAuth(async (req, user) => {
  // Only platform admins can see all profiles
  if (!user.isPlatformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get user's profile
  const [userProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.linkedUserId, user.id))
    .limit(1);

  if (!userProfile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 400 });
  }

  // Get all profiles
  const allProfiles = await db
    .select()
    .from(profiles);

  // Get user's direct connection IDs
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

  // Get connection counts for all profiles
  const allConnectionCounts = await db
    .select({
      profileAId: connections.profileAId,
      profileBId: connections.profileBId,
    })
    .from(connections);

  const countMap = new Map<string, number>();
  allConnectionCounts.forEach(conn => {
    countMap.set(conn.profileAId, (countMap.get(conn.profileAId) || 0) + 1);
    countMap.set(conn.profileBId, (countMap.get(conn.profileBId) || 0) + 1);
  });

  // Build response
  const results = allProfiles
    .filter(p => p.id !== userProfile.id) // Exclude self
    .map(profile => ({
      id: profile.id,
      name: profile.name,
      profilePicture: profile.profilePicture,
      connectionCount: countMap.get(profile.id) || 0,
      isConnectedToUser: userConnectionIds.has(profile.id),
      linkedUserId: profile.linkedUserId,
    }));

  return NextResponse.json({
    userProfile: {
      id: userProfile.id,
      name: userProfile.name,
      profilePicture: userProfile.profilePicture,
      connectionCount: countMap.get(userProfile.id) || 0,
      isConnectedToUser: false,
      linkedUserId: userProfile.linkedUserId,
    },
    connections: results,
  });
}, 'get all profiles');
