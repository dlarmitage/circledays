import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, events, notes, connections } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq, or, and } from 'drizzle-orm';
import { z } from 'zod';

// Get profile by ID (respects visibility rules)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    
    // Get user's profile
    const [userProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.linkedUserId, user.id))
      .limit(1);
    
    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 400 });
    }
    
    // Get requested profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    // Check if directly connected (1-hop)
    const [profileA, profileB] = [userProfile.id, profile.id].sort();
    const [connection] = await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.profileAId, profileA),
          eq(connections.profileBId, profileB)
        )
      )
      .limit(1);
    
    const isDirectConnection = !!connection || userProfile.id === profile.id;
    
    if (!isDirectConnection) {
      // Return limited info for non-connected profiles
      return NextResponse.json({
        profile: {
          id: profile.id,
          name: profile.name,
          profilePicture: profile.profilePicture,
        },
        isDirectConnection: false,
        hopDistance: 2, // Simplified - would need BFS for actual distance
      });
    }
    
    // Get events for connected profile
    const profileEvents = await db
      .select()
      .from(events)
      .where(eq(events.profileId, profile.id));
    
    // Get user's notes for this profile
    const [userNote] = await db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.profileId, profile.id),
          eq(notes.userId, user.id)
        )
      )
      .limit(1);
    
    // Get profile's connections (for display on profile page)
    const profileConnections = await db
      .select({
        profile: profiles,
      })
      .from(connections)
      .innerJoin(
        profiles,
        or(
          and(
            eq(connections.profileAId, profile.id),
            eq(profiles.id, connections.profileBId)
          ),
          and(
            eq(connections.profileBId, profile.id),
            eq(profiles.id, connections.profileAId)
          )
        )
      )
      .where(
        or(
          eq(connections.profileAId, profile.id),
          eq(connections.profileBId, profile.id)
        )
      );
    
    // Get user's connections (for invite modal - excludes user's own profile and the profile being viewed)
    const userConnections = await db
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
    
    // Filter out user's own profile and the profile being viewed
    const userConnectionsFiltered = userConnections
      .map(c => c.profile)
      .filter(p => p.id !== userProfile.id && p.id !== profile.id);
    
    return NextResponse.json({
      profile,
      events: profileEvents,
      note: userNote || null,
      connections: profileConnections.map(c => c.profile),
      userConnections: userConnectionsFiltered,
      connectionId: connection?.id || null,
      isDirectConnection: true,
      isOwnProfile: profile.linkedUserId === user.id,
      isCreator: profile.createdByUserId === user.id,
      userProfileId: userProfile.id,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    );
  }
}

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  profilePicture: z.string().url().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const data = updateProfileSchema.parse(body);
    
    // Get profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    // Check permission (creator or own profile)
    const isOwn = profile.linkedUserId === user.id;
    const isCreator = profile.createdByUserId === user.id;
    
    if (!isOwn && !isCreator && !user.isPlatformAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Update profile
    const [updatedProfile] = await db
      .update(profiles)
      .set(data)
      .where(eq(profiles.id, id))
      .returning();
    
    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error('Update profile error:', error);
    
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
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    
    // Get profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    // Check permission (unlinked + creator, or own profile, or admin)
    const isOwn = profile.linkedUserId === user.id;
    const isCreatorOfUnlinked = profile.createdByUserId === user.id && !profile.linkedUserId;
    
    if (!isOwn && !isCreatorOfUnlinked && !user.isPlatformAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Delete profile (cascades connections, events, notes)
    await db.delete(profiles).where(eq(profiles.id, id));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete profile error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to delete profile' },
      { status: 500 }
    );
  }
}

