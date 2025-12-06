import { NextRequest, NextResponse } from 'next/server';
import { db, connectionSuggestions, profiles, users, connections } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq, and, or, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { sendSuggestionEmail } from '@/lib/email';

const createSuggestionsSchema = z.object({
  profileIds: z.array(z.string().uuid()).min(1),
  connectTogether: z.boolean().optional().default(false), // For connecting unclaimed profiles to each other
});

// POST - Create suggestions and auto-connect unclaimed profiles
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
    
    // Get sender's existing connections
    const senderConnections = await db
      .select()
      .from(connections)
      .where(
        or(
          eq(connections.profileAId, senderProfile.id),
          eq(connections.profileBId, senderProfile.id)
        )
      );
    
    const senderConnectionIds = new Set<string>();
    senderConnections.forEach(conn => {
      if (conn.profileAId === senderProfile.id) {
        senderConnectionIds.add(conn.profileBId);
      } else {
        senderConnectionIds.add(conn.profileAId);
      }
    });
    
    let suggestedCount = 0;
    let autoConnectedCount = 0;
    let alreadyConnectedCount = 0;
    const usersToNotify = new Map<string, { user: typeof users.$inferSelect; profileIds: string[] }>();
    
    // Process each selected profile
    for (const profile of selectedProfiles) {
      // Skip if already connected
      if (senderConnectionIds.has(profile.id)) {
        alreadyConnectedCount++;
        continue;
      }
      
      if (profile.linkedUserId) {
        // Profile has an account - create a suggestion
        const toUserId = profile.linkedUserId;
        
        // Check if suggestion already exists
        const [existingSuggestion] = await db
          .select()
          .from(connectionSuggestions)
          .where(
            and(
              eq(connectionSuggestions.fromUserId, user.id),
              eq(connectionSuggestions.toUserId, toUserId),
              eq(connectionSuggestions.suggestedProfileId, profile.id),
              eq(connectionSuggestions.status, 'pending')
            )
          )
          .limit(1);
        
        if (!existingSuggestion) {
          // Create suggestion
          await db.insert(connectionSuggestions).values({
            fromUserId: user.id,
            toUserId: toUserId,
            suggestedProfileId: profile.id,
          });
          
          suggestedCount++;
          
          // Track for email notification
          if (!usersToNotify.has(toUserId)) {
            const [toUser] = await db
              .select()
              .from(users)
              .where(eq(users.id, toUserId))
              .limit(1);
            
            if (toUser) {
              usersToNotify.set(toUserId, { user: toUser, profileIds: [] });
            }
          }
          usersToNotify.get(toUserId)?.profileIds.push(profile.id);
        }
      } else {
        // Profile doesn't have an account - auto-create connection
        const [profileA, profileB] = [senderProfile.id, profile.id].sort();
        
        // Check if connection already exists (shouldn't, but just in case)
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
          await db.insert(connections).values({
            profileAId: profileA,
            profileBId: profileB,
            createdByUserId: user.id,
          });
          autoConnectedCount++;
          senderConnectionIds.add(profile.id); // Track for connectTogether logic
        }
      }
    }
    
    // Handle "connect together" - connect unclaimed profiles to each other
    if (data.connectTogether) {
      const unclaimedProfiles = selectedProfiles.filter(p => !p.linkedUserId);
      
      for (let i = 0; i < unclaimedProfiles.length; i++) {
        for (let j = i + 1; j < unclaimedProfiles.length; j++) {
          const profileA = unclaimedProfiles[i];
          const profileB = unclaimedProfiles[j];
          const [idA, idB] = [profileA.id, profileB.id].sort();
          
          // Check if already connected
          const [existingConnection] = await db
            .select()
            .from(connections)
            .where(
              and(
                eq(connections.profileAId, idA),
                eq(connections.profileBId, idB)
              )
            )
            .limit(1);
          
          if (!existingConnection) {
            await db.insert(connections).values({
              profileAId: idA,
              profileBId: idB,
              createdByUserId: user.id,
            });
          }
        }
      }
    }
    
    // Send email notifications to users who received suggestions
    for (const [toUserId, { user: toUser, profileIds }] of usersToNotify.entries()) {
      const suggestedProfiles = selectedProfiles.filter(p => profileIds.includes(p.id));
      
      try {
        await sendSuggestionEmail(
          toUser.email,
          toUser.name,
          user.name,
          suggestedProfiles.map(p => p.name),
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
      alreadyConnected: alreadyConnectedCount,
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

