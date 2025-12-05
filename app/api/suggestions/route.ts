import { NextRequest, NextResponse } from 'next/server';
import { db, connectionSuggestions, profiles, users, connections } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq, and, or, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { sendSuggestionEmail } from '@/lib/email';

const createSuggestionsSchema = z.object({
  toUserId: z.string().uuid(),
  profileIds: z.array(z.string().uuid()).min(1),
});

// POST - Create batch suggestions
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = createSuggestionsSchema.parse(body);
    
    // Verify the recipient user exists and has an account
    const [recipient] = await db
      .select()
      .from(users)
      .where(eq(users.id, data.toUserId))
      .limit(1);
    
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }
    
    // Get recipient's profile
    const [recipientProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.linkedUserId, recipient.id))
      .limit(1);
    
    if (!recipientProfile) {
      return NextResponse.json({ error: 'Recipient profile not found' }, { status: 404 });
    }
    
    // Get sender's profile
    const [senderProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.linkedUserId, user.id))
      .limit(1);
    
    if (!senderProfile) {
      return NextResponse.json({ error: 'Sender profile not found' }, { status: 400 });
    }
    
    // Verify sender is connected to recipient
    const [senderRecipientA, senderRecipientB] = [senderProfile.id, recipientProfile.id].sort();
    const [connectionToRecipient] = await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.profileAId, senderRecipientA),
          eq(connections.profileBId, senderRecipientB)
        )
      )
      .limit(1);
    
    if (!connectionToRecipient) {
      return NextResponse.json({ error: 'You must be connected to this person' }, { status: 403 });
    }
    
    // Get recipient's existing connections
    const recipientConnections = await db
      .select()
      .from(connections)
      .where(
        or(
          eq(connections.profileAId, recipientProfile.id),
          eq(connections.profileBId, recipientProfile.id)
        )
      );
    
    const recipientConnectionIds = new Set<string>();
    recipientConnections.forEach(conn => {
      if (conn.profileAId === recipientProfile.id) {
        recipientConnectionIds.add(conn.profileBId);
      } else {
        recipientConnectionIds.add(conn.profileAId);
      }
    });
    
    // Filter out profiles recipient is already connected to
    const eligibleProfileIds = data.profileIds.filter(id => 
      !recipientConnectionIds.has(id) && id !== recipientProfile.id
    );
    
    if (eligibleProfileIds.length === 0) {
      return NextResponse.json({ 
        error: 'All selected profiles are already connected to this person',
        created: 0 
      }, { status: 400 });
    }
    
    // Check for existing pending suggestions
    const existingSuggestions = await db
      .select()
      .from(connectionSuggestions)
      .where(
        and(
          eq(connectionSuggestions.toUserId, recipient.id),
          eq(connectionSuggestions.status, 'pending'),
          inArray(connectionSuggestions.suggestedProfileId, eligibleProfileIds)
        )
      );
    
    const existingProfileIds = new Set(existingSuggestions.map(s => s.suggestedProfileId));
    const newProfileIds = eligibleProfileIds.filter(id => !existingProfileIds.has(id));
    
    // Create new suggestions
    if (newProfileIds.length > 0) {
      await db.insert(connectionSuggestions).values(
        newProfileIds.map(profileId => ({
          fromUserId: user.id,
          toUserId: recipient.id,
          suggestedProfileId: profileId,
        }))
      );
      
      // Get profile names for email
      const suggestedProfiles = await db
        .select()
        .from(profiles)
        .where(inArray(profiles.id, newProfileIds));
      
      // Send email notification
      try {
        await sendSuggestionEmail(
          recipient.email,
          recipient.name,
          user.name,
          suggestedProfiles.map(p => p.name),
          process.env.NEXT_PUBLIC_APP_URL || 'https://circledays.app'
        );
      } catch (emailError) {
        console.error('Failed to send suggestion email:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    return NextResponse.json({
      created: newProfileIds.length,
      alreadySuggested: existingProfileIds.size,
      alreadyConnected: data.profileIds.length - eligibleProfileIds.length,
    });
  } catch (error) {
    console.error('Create suggestions error:', error);
    
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
      { error: 'Failed to create suggestions' },
      { status: 500 }
    );
  }
}

// GET - Get pending suggestions for current user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    // Get all pending suggestions for this user
    const pendingSuggestions = await db
      .select({
        suggestion: connectionSuggestions,
        profile: profiles,
        fromUser: users,
      })
      .from(connectionSuggestions)
      .innerJoin(profiles, eq(connectionSuggestions.suggestedProfileId, profiles.id))
      .innerJoin(users, eq(connectionSuggestions.fromUserId, users.id))
      .where(
        and(
          eq(connectionSuggestions.toUserId, user.id),
          eq(connectionSuggestions.status, 'pending')
        )
      );
    
    // Group by sender
    const groupedBySender = pendingSuggestions.reduce((acc, item) => {
      const senderId = item.fromUser.id;
      if (!acc[senderId]) {
        acc[senderId] = {
          fromUser: {
            id: item.fromUser.id,
            name: item.fromUser.name,
          },
          suggestions: [],
        };
      }
      acc[senderId].suggestions.push({
        id: item.suggestion.id,
        profile: {
          id: item.profile.id,
          name: item.profile.name,
          profilePicture: item.profile.profilePicture,
        },
        createdAt: item.suggestion.createdAt,
      });
      return acc;
    }, {} as Record<string, { fromUser: { id: string; name: string }; suggestions: any[] }>);
    
    return NextResponse.json({
      suggestions: Object.values(groupedBySender),
      totalCount: pendingSuggestions.length,
    });
  } catch (error) {
    console.error('Get suggestions error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}

