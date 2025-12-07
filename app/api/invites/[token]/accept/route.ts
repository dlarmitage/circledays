import { NextRequest, NextResponse } from 'next/server';
import { db, invites, profiles, users, connections, reminderPreferences, connectionSuggestions } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const acceptInviteSchema = z.object({
  name: z.string().min(1).max(100),
  timezone: z.string(),
  mobile: z.string().optional(),
  notificationChannel: z.enum(['email', 'sms', 'both']).default('email'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const data = acceptInviteSchema.parse(body);
    
    // Get invite
    const [invite] = await db
      .select()
      .from(invites)
      .where(eq(invites.token, token))
      .limit(1);
    
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }
    
    // Check if expired
    if (new Date() > invite.expiresAt) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 410 });
    }
    
    // Check if already accepted
    if (invite.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invite already used' },
        { status: 410 }
      );
    }
    
    // Check if email already has an account
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, invite.email))
      .limit(1);
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in.' },
        { status: 400 }
      );
    }
    
    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: invite.email,
        name: data.name,
        timezone: data.timezone,
        mobile: data.mobile || null,
        notificationChannel: data.notificationChannel,
      })
      .returning();
    
    // Link profile to user
    await db
      .update(profiles)
      .set({ linkedUserId: newUser.id })
      .where(eq(profiles.id, invite.profileId));
    
    // Create default reminder preferences
    await db.insert(reminderPreferences).values({
      userId: newUser.id,
      defaultLeadDays: [0, 1, 7],
    });
    
    // Create seed connections
    // Note: This does NOT affect existing connection suggestions - suggestions remain independent
    // and will still be shown to the user even if connections are created here
    if (invite.seedConnectionIds && invite.seedConnectionIds.length > 0) {
      // Get user's profile (the one they're claiming)
      const [userProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, invite.profileId))
        .limit(1);
      
      for (const seedProfileId of invite.seedConnectionIds) {
        // Create connection (ensure consistent ordering)
        const [profileA, profileB] = [userProfile.id, seedProfileId].sort();
        
        try {
          await db.insert(connections).values({
            profileAId: profileA,
            profileBId: profileB,
            createdByUserId: invite.invitedByUserId,
          });
          
          // If a connection was created and there are pending suggestions for this profile,
          // mark those suggestions as accepted (since the connection now exists)
          // This prevents duplicate suggestions for already-connected profiles
          await db
            .update(connectionSuggestions)
            .set({ status: 'accepted' })
            .where(
              and(
                eq(connectionSuggestions.toUserId, newUser.id),
                eq(connectionSuggestions.suggestedProfileId, seedProfileId),
                eq(connectionSuggestions.status, 'pending')
              )
            );
        } catch (e) {
          // Ignore duplicate connection errors
        }
      }
    }
    
    // Mark invite as accepted
    await db
      .update(invites)
      .set({ status: 'accepted' })
      .where(eq(invites.id, invite.id));
    
    // Create session
    await createSession(newUser.id);
    
    return NextResponse.json({
      success: true,
      user: newUser,
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    );
  }
}

