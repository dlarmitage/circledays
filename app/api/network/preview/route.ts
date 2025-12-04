import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, connections } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq, or, and, sql } from 'drizzle-orm';

// Get preview info for a non-connected profile (for connection modal)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    
    if (!profileId) {
      return NextResponse.json({ error: 'profileId required' }, { status: 400 });
    }
    
    // Get user's profile
    const [userProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.linkedUserId, user.id))
      .limit(1);
    
    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 400 });
    }
    
    // Get target profile
    const [targetProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);
    
    if (!targetProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    // Get user's connection IDs
    const userConnectionRows = await db
      .select({
        profileId: sql<string>`
          CASE 
            WHEN ${connections.profileAId} = ${userProfile.id} THEN ${connections.profileBId}
            ELSE ${connections.profileAId}
          END
        `.as('profile_id'),
      })
      .from(connections)
      .where(
        or(
          eq(connections.profileAId, userProfile.id),
          eq(connections.profileBId, userProfile.id)
        )
      );
    
    const userConnectionIds = new Set(userConnectionRows.map(r => r.profileId));
    
    // Get target profile's connections
    const targetConnectionRows = await db
      .select({
        profile: profiles,
      })
      .from(connections)
      .innerJoin(
        profiles,
        or(
          and(
            eq(connections.profileAId, profileId),
            eq(profiles.id, connections.profileBId)
          ),
          and(
            eq(connections.profileBId, profileId),
            eq(profiles.id, connections.profileAId)
          )
        )
      )
      .where(
        or(
          eq(connections.profileAId, profileId),
          eq(connections.profileBId, profileId)
        )
      );
    
    // Find mutual connections (people both user and target are connected to)
    const mutualConnections = targetConnectionRows
      .filter(c => userConnectionIds.has(c.profile.id))
      .map(c => ({
        id: c.profile.id,
        name: c.profile.name,
        profilePicture: c.profile.profilePicture,
      }));
    
    return NextResponse.json({
      profile: {
        id: targetProfile.id,
        name: targetProfile.name,
        profilePicture: targetProfile.profilePicture,
        isClaimed: !!targetProfile.linkedUserId,
        connectionCount: targetConnectionRows.length,
      },
      mutualConnections,
    });
  } catch (error) {
    console.error('Get profile preview error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to get profile preview' },
      { status: 500 }
    );
  }
}

