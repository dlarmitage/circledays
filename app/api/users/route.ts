import { NextRequest, NextResponse } from 'next/server';
import { db, users, profiles, reminderPreferences, events, invites } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { capitalizeName } from '@/lib/utils';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  timezone: z.string(),
  mobile: z.string().optional(),
  notificationChannel: z.enum(['email', 'sms', 'both']).default('email'),
  birthdate: z.string().optional(), // ISO date string
  claimProfileId: z.string().uuid().optional(), // Existing profile to claim
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createUserSchema.parse(body);
    
    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        name: capitalizeName(data.name),
        timezone: data.timezone,
        mobile: data.mobile || null,
        notificationChannel: data.notificationChannel,
      })
      .returning();
    
    let userProfile;
    
    // Check if we're claiming an existing profile
    if (data.claimProfileId) {
      // Verify the profile exists and is unlinked
      const [existingProfile] = await db
        .select()
        .from(profiles)
        .where(
          and(
            eq(profiles.id, data.claimProfileId),
            isNull(profiles.linkedUserId)
          )
        )
        .limit(1);
      
      if (existingProfile) {
        // Claim the existing profile
        const [claimedProfile] = await db
          .update(profiles)
          .set({
            linkedUserId: newUser.id,
            name: capitalizeName(data.name), // Update name to match user's input
          })
          .where(eq(profiles.id, data.claimProfileId))
          .returning();
        
        userProfile = claimedProfile;
        
        // Mark any pending invites for this profile as accepted
        await db
          .update(invites)
          .set({ status: 'accepted' })
          .where(eq(invites.profileId, data.claimProfileId));
      }
    }
    
    // If we didn't claim a profile, create a new one
    if (!userProfile) {
      const [newProfile] = await db
        .insert(profiles)
        .values({
          name: capitalizeName(data.name),
          createdByUserId: newUser.id,
          linkedUserId: newUser.id,
        })
        .returning();
      
      userProfile = newProfile;
    }
    
    // Create default reminder preferences
    await db.insert(reminderPreferences).values({
      userId: newUser.id,
      defaultLeadDays: [0, 1, 7],
    });
    
    // If birthdate provided and not already on profile, create birthday event
    if (data.birthdate) {
      // Check if profile already has a birthday event
      const existingBirthday = await db
        .select()
        .from(events)
        .where(
          and(
            eq(events.profileId, userProfile.id),
            eq(events.type, 'birthday')
          )
        )
        .limit(1);
      
      if (existingBirthday.length === 0) {
        await db.insert(events).values({
          profileId: userProfile.id,
          type: 'birthday',
          date: data.birthdate,
          createdByUserId: newUser.id,
        });
      }
    }
    
    // Create session
    await createSession(newUser.id);
    
    return NextResponse.json({
      user: newUser,
      profile: userProfile,
    });
  } catch (error) {
    console.error('Create user error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}


