import { NextRequest, NextResponse } from 'next/server';
import { db, users, profiles, reminderPreferences } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  timezone: z.string(),
  mobile: z.string().optional(),
  notificationChannel: z.enum(['email', 'sms', 'both']).default('email'),
  birthdate: z.string().optional(), // ISO date string
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
        name: data.name,
        timezone: data.timezone,
        mobile: data.mobile || null,
        notificationChannel: data.notificationChannel,
      })
      .returning();
    
    // Create user's own profile
    const [newProfile] = await db
      .insert(profiles)
      .values({
        name: data.name,
        createdByUserId: newUser.id,
        linkedUserId: newUser.id,
      })
      .returning();
    
    // Create default reminder preferences
    await db.insert(reminderPreferences).values({
      userId: newUser.id,
      defaultLeadDays: [0, 1, 7],
    });
    
    // If birthdate provided, create birthday event
    if (data.birthdate) {
      const { events } = await import('@/lib/db');
      await db.insert(events).values({
        profileId: newProfile.id,
        type: 'birthday',
        date: data.birthdate,
      });
    }
    
    // Create session
    await createSession(newUser.id);
    
    return NextResponse.json({
      user: newUser,
      profile: newProfile,
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


