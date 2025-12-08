import { NextRequest, NextResponse } from 'next/server';
import { db, connectionSuggestions, profiles, users, connections } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq, and, or, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { sendSuggestionEmail } from '@/lib/email';

const createSuggestionsSchema = z.object({
  profileIds: z.array(z.string().uuid()).min(1),
  connectTogether: z.boolean().optional().default(false), // For connecting selected profiles to each other
});

// POST - Connect selected profiles together
// - Unclaimed profiles get connected directly
// - Claimed profiles (users with accounts) receive suggestions to connect to unclaimed profiles
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
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
    
    let suggestedCount = 0;
    let autoConnectedCount = 0;
    const usersToNotify = new Map<string, { user: typeof users.$inferSelect; suggestedProfiles: typeof selectedProfiles }>();
    
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
    
    // Helper to create suggestion
    const createSuggestion = async (toUserId: string, suggestedProfileId: string): Promise<boolean> => {
      // Check if suggestion already exists
      const [existingSuggestion] = await db
        .select()
        .from(connectionSuggestions)
        .where(
          and(
            eq(connectionSuggestions.toUserId, toUserId),
            eq(connectionSuggestions.suggestedProfileId, suggestedProfileId),
            eq(connectionSuggestions.status, 'pending')
          )
        )
        .limit(1);
      
      if (existingSuggestion) return false;
      
      // Check if already connected
      const [targetProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.linkedUserId, toUserId))
        .limit(1);
      
      if (targetProfile && await connectionExists(targetProfile.id, suggestedProfileId)) {
        return false;
      }
      
      await db.insert(connectionSuggestions).values({
        fromUserId: user.id,
        toUserId: toUserId,
        suggestedProfileId: suggestedProfileId,
      });
      return true;
    };
    
    // Separate claimed and unclaimed profiles
    const claimedProfiles = selectedProfiles.filter(p => p.linkedUserId && p.linkedUserId !== user.id);
    const unclaimedProfiles = selectedProfiles.filter(p => !p.linkedUserId);
    
    // Step 1: Connect all UNCLAIMED profiles to the SENDER
    for (const profile of unclaimedProfiles) {
      if (await createConnection(senderProfile.id, profile.id)) {
        autoConnectedCount++;
      }
    }
    
    // Step 2: If connectTogether, connect all profiles with each other
    if (data.connectTogether) {
      // Connect unclaimed profiles to each other
      for (let i = 0; i < unclaimedProfiles.length; i++) {
        for (let j = i + 1; j < unclaimedProfiles.length; j++) {
          await createConnection(unclaimedProfiles[i].id, unclaimedProfiles[j].id);
        }
      }
      
      // For each claimed profile (user with account), suggest unclaimed profiles to them
      for (const claimedProfile of claimedProfiles) {
        const toUserId = claimedProfile.linkedUserId!;
        
        for (const unclaimedProfile of unclaimedProfiles) {
          if (await createSuggestion(toUserId, unclaimedProfile.id)) {
            suggestedCount++;
            
            // Track for email notification
            if (!usersToNotify.has(toUserId)) {
              const [toUser] = await db
                .select()
                .from(users)
                .where(eq(users.id, toUserId))
                .limit(1);
              
              if (toUser) {
                usersToNotify.set(toUserId, { user: toUser, suggestedProfiles: [] });
              }
            }
            usersToNotify.get(toUserId)?.suggestedProfiles.push(unclaimedProfile);
          }
        }
        
        // Also connect claimed profiles to the sender (if not already)
        if (await createConnection(senderProfile.id, claimedProfile.id)) {
          autoConnectedCount++;
        }
      }
      
      // Connect claimed profiles to each other (create direct connections since they're both in the group)
      for (let i = 0; i < claimedProfiles.length; i++) {
        for (let j = i + 1; j < claimedProfiles.length; j++) {
          await createConnection(claimedProfiles[i].id, claimedProfiles[j].id);
        }
      }
    }
    
    // Send email notifications to users who received suggestions
    for (const [toUserId, { user: toUser, suggestedProfiles: suggested }] of usersToNotify.entries()) {
      if (suggested.length === 0) continue;
      
      try {
        await sendSuggestionEmail(
          toUser.email,
          toUser.name,
          user.name,
          suggested.map(p => p.name),
          process.env.NEXT_PUBLIC_APP_URL || 'https://circledays.ambient.technology'
        );
      } catch (emailError) {
        console.error('Failed to send suggestion email:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    return NextResponse.json({
      suggested: suggestedCount,
      autoConnected: autoConnectedCount,
      total: data.profileIds.length,
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

