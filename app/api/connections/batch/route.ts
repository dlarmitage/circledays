import { NextRequest, NextResponse } from 'next/server';
import { db, connections, profiles } from '@/lib/db';
import { withAuth } from '@/lib/api-handler';
import { and, eq, or, inArray } from 'drizzle-orm';
import { z } from 'zod';

const batchConnectSchema = z.object({
  profileIds: z.array(z.string().uuid()).min(2),
});

// POST - Create connections between all provided profiles
export const POST = withAuth(async (req, user) => {
  const body = await req.json();
  const data = batchConnectSchema.parse(body);

  // Verify all profiles exist and are unclaimed (no linkedUserId)
  const targetProfiles = await db
    .select()
    .from(profiles)
    .where(inArray(profiles.id, data.profileIds));

  if (targetProfiles.length !== data.profileIds.length) {
    return NextResponse.json({ error: 'Some profiles not found' }, { status: 404 });
  }

  // Check that all profiles are unclaimed
  const claimedProfiles = targetProfiles.filter(p => p.linkedUserId);
  if (claimedProfiles.length > 0) {
    return NextResponse.json({
      error: 'Cannot batch connect profiles that have accounts. Only unclaimed profiles can be connected this way.',
      claimedNames: claimedProfiles.map(p => p.name)
    }, { status: 400 });
  }

  // Get user's profile to verify they can do this
  const [userProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.linkedUserId, user.id))
    .limit(1);

  if (!userProfile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 400 });
  }

  // Verify user is connected to at least one of the profiles (they have some relationship to this group)
  const userConnections = await db
    .select()
    .from(connections)
    .where(
      or(
        eq(connections.profileAId, userProfile.id),
        eq(connections.profileBId, userProfile.id)
      )
    );

  const userConnectionIds = new Set<string>();
  userConnections.forEach(conn => {
    if (conn.profileAId === userProfile.id) {
      userConnectionIds.add(conn.profileBId);
    } else {
      userConnectionIds.add(conn.profileAId);
    }
  });

  const isConnectedToAny = data.profileIds.some(id => userConnectionIds.has(id));
  if (!isConnectedToAny) {
    return NextResponse.json({
      error: 'You must be connected to at least one of these profiles'
    }, { status: 403 });
  }

  // Generate all pairs of profile IDs
  const pairs: { profileAId: string; profileBId: string }[] = [];
  for (let i = 0; i < data.profileIds.length; i++) {
    for (let j = i + 1; j < data.profileIds.length; j++) {
      const [a, b] = [data.profileIds[i], data.profileIds[j]].sort();
      pairs.push({ profileAId: a, profileBId: b });
    }
  }

  // Check which connections already exist
  const existingConnections = await db
    .select()
    .from(connections)
    .where(
      or(
        ...pairs.map(pair =>
          and(
            eq(connections.profileAId, pair.profileAId),
            eq(connections.profileBId, pair.profileBId)
          )
        )
      )
    );

  const existingSet = new Set(
    existingConnections.map(c => `${c.profileAId}-${c.profileBId}`)
  );

  // Filter to only new connections
  const newPairs = pairs.filter(
    pair => !existingSet.has(`${pair.profileAId}-${pair.profileBId}`)
  );

  // Create new connections
  if (newPairs.length > 0) {
    await db.insert(connections).values(
      newPairs.map(pair => ({
        ...pair,
        createdByUserId: user.id,
      }))
    );
  }

  return NextResponse.json({
    created: newPairs.length,
    alreadyExisted: pairs.length - newPairs.length,
    total: pairs.length,
  });
}, 'batch connect');
