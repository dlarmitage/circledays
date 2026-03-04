import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, connections } from '@/lib/db';
import { withAuth } from '@/lib/api-handler';
import { eq, or, and, sql, desc, isNull } from 'drizzle-orm';
import { z } from 'zod';

// Get user's connections
export const GET = withAuth(async (req, user) => {
  const { searchParams } = new URL(req.url);
  const includeNew = searchParams.get('includeNew') === 'true';

  // Get user's profile
  const [userProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.linkedUserId, user.id))
    .limit(1);

  if (!userProfile) {
    return NextResponse.json({ connections: [], newConnections: [] });
  }

  // Get all connections with profile data
  const userConnections = await db
    .select({
      connection: connections,
      profile: profiles,
    })
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

  let newConnections: typeof userConnections = [];

  // If requested, find connections made by others (not by this user or during onboarding)
  if (includeNew) {
    // New connections are those where:
    // 1. createdByUserId is NOT this user
    // 2. Created after their last login (or within last 30 days for simplicity)
    // 3. Not already "seen" (we'll use a simple time-based approach)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    newConnections = userConnections.filter(({ connection, profile }) => {
      // Connection was created by someone else (not this user)
      const createdByOther = connection.createdByUserId !== user.id;
      // Connection is recent (within 30 days)
      const isRecent = connection.createdAt && new Date(connection.createdAt) > thirtyDaysAgo;
      // Don't show private profiles created by others
      const isVisible = !profile.isPrivate || profile.createdByUserId === user.id;
      return createdByOther && isRecent && isVisible;
    });
  }

  return NextResponse.json({
    connections: userConnections.map(({ connection, profile }) => ({
      connectionId: connection.id,
      profile,
      createdAt: connection.createdAt,
      createdByUserId: connection.createdByUserId,
    })),
    newConnections: newConnections.map(({ connection, profile }) => ({
      connectionId: connection.id,
      profile,
      createdAt: connection.createdAt,
      createdByUserId: connection.createdByUserId,
    })),
  });
}, 'get connections');

const createConnectionSchema = z.object({
  profileId: z.string().uuid(),
});

// Create a connection - always instant, no approval needed
// Since email/mobile are hidden, there's no privacy risk in connections
export const POST = withAuth(async (req, user) => {
  const body = await req.json();
  const { profileId } = createConnectionSchema.parse(body);

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

  // Check if already connected
  const [profileA, profileB] = [userProfile.id, targetProfile.id].sort();
  const [existingConnection] = await db
    .select()
    .from(connections)
    .where(
      and(
        eq(connections.profileAId, profileA),
        eq(connections.profileBId, profileB)
      )
    )
    .limit(1);

  if (existingConnection) {
    return NextResponse.json({ error: 'Already connected' }, { status: 400 });
  }

  // Create instant connection - no approval flow needed
  const [newConnection] = await db
    .insert(connections)
    .values({
      profileAId: profileA,
      profileBId: profileB,
      createdByUserId: user.id,
    })
    .returning();

  return NextResponse.json({
    connection: newConnection,
    type: 'instant',
  });
}, 'create connection');
