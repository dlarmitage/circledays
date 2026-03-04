import { NextResponse } from 'next/server';
import { db, connectionSuggestions, profiles, connections } from '@/lib/db';
import { withAuthParams } from '@/lib/api-handler';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateSuggestionSchema = z.object({
  action: z.enum(['accept', 'decline']),
});

// PATCH - Accept or decline a suggestion
export const PATCH = withAuthParams(async (req, user, params: { id: string }) => {
  const body = await req.json();
  const data = updateSuggestionSchema.parse(body);

  // Get the suggestion
  const [suggestion] = await db
    .select()
    .from(connectionSuggestions)
    .where(eq(connectionSuggestions.id, params.id))
    .limit(1);

  if (!suggestion) {
    return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
  }

  // Verify user is the recipient
  if (suggestion.toUserId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verify suggestion is still pending
  if (suggestion.status !== 'pending') {
    return NextResponse.json({ error: 'Suggestion already processed' }, { status: 400 });
  }

  if (data.action === 'accept') {
    // Get user's profile
    const [userProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.linkedUserId, user.id))
      .limit(1);

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 400 });
    }

    // Check if already connected
    const [profileA, profileB] = [userProfile.id, suggestion.suggestedProfileId].sort();
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

    if (!existingConnection) {
      // Create the connection
      await db.insert(connections).values({
        profileAId: profileA,
        profileBId: profileB,
        createdByUserId: user.id,
      });
    }

    // Update suggestion status
    await db
      .update(connectionSuggestions)
      .set({ status: 'accepted' })
      .where(eq(connectionSuggestions.id, params.id));

    return NextResponse.json({ success: true, action: 'accepted' });
  } else {
    // Decline - just update status
    await db
      .update(connectionSuggestions)
      .set({ status: 'declined' })
      .where(eq(connectionSuggestions.id, params.id));

    return NextResponse.json({ success: true, action: 'declined' });
  }
}, 'update suggestion');
