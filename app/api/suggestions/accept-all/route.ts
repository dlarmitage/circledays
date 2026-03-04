import { NextResponse } from 'next/server';
import { db, connectionSuggestions, profiles, connections } from '@/lib/db';
import { withAuth } from '@/lib/api-handler';
import { eq, and, or } from 'drizzle-orm';

// POST - Accept all pending suggestions
export const POST = withAuth(async (req, user) => {
  // Get user's profile
  const [userProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.linkedUserId, user.id))
    .limit(1);

  if (!userProfile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 400 });
  }

  // Get all pending suggestions for this user
  const pendingSuggestions = await db
    .select()
    .from(connectionSuggestions)
    .where(
      and(
        eq(connectionSuggestions.toUserId, user.id),
        eq(connectionSuggestions.status, 'pending')
      )
    );

  if (pendingSuggestions.length === 0) {
    return NextResponse.json({ accepted: 0 });
  }

  // Get existing connections
  const existingConnections = await db
    .select()
    .from(connections)
    .where(
      or(
        eq(connections.profileAId, userProfile.id),
        eq(connections.profileBId, userProfile.id)
      )
    );

  const existingConnectionIds = new Set<string>();
  existingConnections.forEach(conn => {
    if (conn.profileAId === userProfile.id) {
      existingConnectionIds.add(conn.profileBId);
    } else {
      existingConnectionIds.add(conn.profileAId);
    }
  });

  // Create connections for each suggestion
  let acceptedCount = 0;
  for (const suggestion of pendingSuggestions) {
    // Skip if already connected
    if (existingConnectionIds.has(suggestion.suggestedProfileId)) {
      // Still mark as accepted
      await db
        .update(connectionSuggestions)
        .set({ status: 'accepted' })
        .where(eq(connectionSuggestions.id, suggestion.id));
      continue;
    }

    // Create connection
    const [profileA, profileB] = [userProfile.id, suggestion.suggestedProfileId].sort();

    try {
      await db.insert(connections).values({
        profileAId: profileA,
        profileBId: profileB,
        createdByUserId: user.id,
      });
      existingConnectionIds.add(suggestion.suggestedProfileId);
      acceptedCount++;
    } catch (err) {
      // Connection might already exist due to race condition
      console.error('Failed to create connection:', err);
    }

    // Mark suggestion as accepted
    await db
      .update(connectionSuggestions)
      .set({ status: 'accepted' })
      .where(eq(connectionSuggestions.id, suggestion.id));
  }

  return NextResponse.json({
    accepted: acceptedCount,
    total: pendingSuggestions.length,
  });
}, 'accept all suggestions');
