import { NextResponse } from 'next/server';
import { db, profiles, connections } from '@/lib/db';
import { withAuth } from '@/lib/api-handler';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';

const createSuggestionsSchema = z.object({
  profileIds: z.array(z.string().uuid()).min(1),
  connectTogether: z.boolean().optional().default(false), // For connecting selected profiles to each other
});

// POST - Connect selected profiles together
// All connections are instant - no approval needed
// Users will see "New Connections" notification when they log in
export const POST = withAuth(async (req, user) => {
  const body = await req.json();
  const data = createSuggestionsSchema.parse(body);

  // Get sender's profile
  const [senderProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.linkedUserId, user.id))
    .limit(1);

  if (!senderProfile) {
    return NextResponse.json({ error: 'Sender profile not found' }, { status: 400 });
  }

  // Get all selected profiles
  const selectedProfiles = await db
    .select()
    .from(profiles)
    .where(inArray(profiles.id, data.profileIds));

  if (selectedProfiles.length !== data.profileIds.length) {
    return NextResponse.json({ error: 'Some profiles not found' }, { status: 404 });
  }

  let connectedCount = 0;

  // Helper to check if connection exists
  const connectionExists = async (idA: string, idB: string): Promise<boolean> => {
    const [sorted1, sorted2] = [idA, idB].sort();
    const [existing] = await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.profileAId, sorted1),
          eq(connections.profileBId, sorted2)
        )
      )
      .limit(1);
    return !!existing;
  };

  // Helper to create connection
  const createConnection = async (idA: string, idB: string): Promise<boolean> => {
    const [sorted1, sorted2] = [idA, idB].sort();
    if (await connectionExists(idA, idB)) return false;

    await db.insert(connections).values({
      profileAId: sorted1,
      profileBId: sorted2,
      createdByUserId: user.id,
    });
    return true;
  };

  // Step 1: Connect all selected profiles to the SENDER
  for (const profile of selectedProfiles) {
    if (profile.id !== senderProfile.id) {
      if (await createConnection(senderProfile.id, profile.id)) {
        connectedCount++;
      }
    }
  }

  // Step 2: If connectTogether, connect all profiles with each other
  if (data.connectTogether) {
    for (let i = 0; i < selectedProfiles.length; i++) {
      for (let j = i + 1; j < selectedProfiles.length; j++) {
        await createConnection(selectedProfiles[i].id, selectedProfiles[j].id);
      }
    }
  }

  // No emails sent - users will see "New Connections" notification when they log in

  return NextResponse.json({
    connected: connectedCount,
    total: data.profileIds.length,
  });
}, 'create connections');

// GET - Legacy endpoint, returns empty since we now use direct connections
export const GET = withAuth(async () => {
  // Suggestions are no longer used - all connections are automatic
  // This endpoint is kept for backwards compatibility
  return NextResponse.json({
    suggestions: [],
    totalCount: 0,
  });
}, 'get suggestions');
