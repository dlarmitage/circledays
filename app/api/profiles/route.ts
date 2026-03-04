import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, connections, events } from '@/lib/db';
import { withAuth } from '@/lib/api-handler';
import { eq, or, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { capitalizeName } from '@/lib/utils';

// Get user's direct connections (1-hop profiles)
export const GET = withAuth(async (req, user) => {
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
    profiles: connectedProfiles
      .map(c => c.profile)
      .filter(p => !p.isPrivate || p.createdByUserId === user.id),
  });
}, 'get profiles');

const createProfileSchema = z.object({
  name: z.string().min(1).max(100),
  birthdate: z.string(), // ISO date string, required
  profilePicture: z.string().url().nullable().optional(),
  isPrivate: z.boolean().optional().default(false),
});

// Create a new profile
export const POST = withAuth(async (req, user) => {
  const body = await req.json();
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

  // Create profile with capitalized name
  const [newProfile] = await db
    .insert(profiles)
    .values({
      name: capitalizeName(data.name),
      profilePicture: data.profilePicture || null,
      createdByUserId: user.id,
      isPrivate: data.isPrivate,
    })
    .returning();

  // Create birthday event (propagate privacy from profile)
  await db.insert(events).values({
    profileId: newProfile.id,
    type: 'birthday',
    date: data.birthdate,
    isPrivate: data.isPrivate,
    createdByUserId: user.id,
  });

  // Auto-connect to creator
  const [profileA, profileB] = [userProfile.id, newProfile.id].sort();
  await db.insert(connections).values({
    profileAId: profileA,
    profileBId: profileB,
    createdByUserId: user.id,
  });

  return NextResponse.json({ profile: newProfile });
}, 'create profile');
