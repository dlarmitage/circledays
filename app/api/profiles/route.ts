import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, connections, events } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq, or, and, sql } from 'drizzle-orm';
import { z } from 'zod';

// Get user's direct connections (1-hop profiles)
export async function GET() {
  try {
    const user = await requireAuth();
    
    // Get user's profile
    const [userProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.linkedUserId, user.id))
      .limit(1);
    
    if (!userProfile) {
      return NextResponse.json({ profiles: [] });
    }
    
    // Get all connected profiles
    const connectedProfiles = await db
      .select({
        profile: profiles,
      })
      .from(connections)
      .innerJoin(
        profiles,
        or(
          and(
            eq(connections.profileAId, userProfile.id),
            eq(profiles.id, connections.profileBId)
          ),
          and(
            eq(connections.profileBId, userProfile.id),
            eq(profiles.id, connections.profileAId)
          )
        )
      )
      .where(
        or(
          eq(connections.profileAId, userProfile.id),
          eq(connections.profileBId, userProfile.id)
        )
      );
    
    return NextResponse.json({
      profiles: connectedProfiles.map(c => c.profile),
    });
  } catch (error) {
    console.error('Get profiles error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to get profiles' },
      { status: 500 }
    );
  }
}

const createProfileSchema = z.object({
  name: z.string().min(1).max(100),
  birthdate: z.string(), // ISO date string, required
  profilePicture: z.string().url().optional(),
});

// Create a new profile
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = createProfileSchema.parse(body);
    
    // Get user's profile
    const [userProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.linkedUserId, user.id))
      .limit(1);
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 400 }
      );
    }
    
    // Create profile
    const [newProfile] = await db
      .insert(profiles)
      .values({
        name: data.name,
        profilePicture: data.profilePicture || null,
        createdByUserId: user.id,
      })
      .returning();
    
    // Create birthday event
    await db.insert(events).values({
      profileId: newProfile.id,
      type: 'birthday',
      date: data.birthdate,
    });
    
    // Auto-connect to creator
    const [profileA, profileB] = [userProfile.id, newProfile.id].sort();
    await db.insert(connections).values({
      profileAId: profileA,
      profileBId: profileB,
      createdByUserId: user.id,
    });
    
    return NextResponse.json({ profile: newProfile });
  } catch (error) {
    console.error('Create profile error:', error);
    
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
      { error: 'Failed to create profile' },
      { status: 500 }
    );
  }
}


