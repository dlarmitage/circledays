import { NextRequest, NextResponse } from 'next/server';
import { db, connectionSuggestions, profiles, connections } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateSuggestionSchema = z.object({
  action: z.enum(['accept', 'decline']),
});

// PATCH - Accept or decline a suggestion
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const data = updateSuggestionSchema.parse(body);
    
    // Get the suggestion
    const [suggestion] = await db
      .select()
      .from(connectionSuggestions)
      .where(eq(connectionSuggestions.id, id))
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
        .where(eq(connectionSuggestions.id, id));
      
      return NextResponse.json({ success: true, action: 'accepted' });
    } else {
      // Decline - just update status
      await db
        .update(connectionSuggestions)
        .set({ status: 'declined' })
        .where(eq(connectionSuggestions.id, id));
      
      return NextResponse.json({ success: true, action: 'declined' });
    }
  } catch (error) {
    console.error('Update suggestion error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update suggestion' },
      { status: 500 }
    );
  }
}

