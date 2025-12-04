import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, connections } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq, or, and, sql, ne } from 'drizzle-orm';

// Get connections for a specific profile (for tree navigation drill-in)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    
    // Get user's profile
    const [userProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.linkedUserId, user.id))
      .limit(1);
    
    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 400 });
    }
    
    // Get user's direct connection IDs (for marking isConnectedToUser)
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
    userConnectionIds.add(userProfile.id); // Include self
    
    // If no profileId specified, return user's connections
    const targetProfileId = profileId || userProfile.id;
    
    // Check if user has permission to view this profile's connections
    // (must be directly connected or viewing own connections)
    if (targetProfileId !== userProfile.id && !userConnectionIds.has(targetProfileId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get connections for the target profile
    const targetConnections = await db
      .select({
        profile: profiles,
      })
      .from(connections)
      .innerJoin(
        profiles,
        or(
          and(
            eq(connections.profileAId, targetProfileId),
            eq(profiles.id, connections.profileBId)
          ),
          and(
            eq(connections.profileBId, targetProfileId),
            eq(profiles.id, connections.profileAId)
          )
        )
      )
      .where(
        or(
          eq(connections.profileAId, targetProfileId),
          eq(connections.profileBId, targetProfileId)
        )
      );
    
    // For each connection, get their connection count
    const connectionIds = targetConnections.map(c => c.profile.id);
    
    const connectionCounts = await db
      .select({
        profileId: sql<string>`
          CASE 
            WHEN ${connections.profileAId} = ANY(${connectionIds}) THEN ${connections.profileAId}
            ELSE ${connections.profileBId}
          END
        `.as('profile_id'),
        count: sql<number>`count(*)`.as('count'),
      })
      .from(connections)
      .where(
        or(
          sql`${connections.profileAId} = ANY(${connectionIds})`,
          sql`${connections.profileBId} = ANY(${connectionIds})`
        )
      )
      .groupBy(sql`profile_id`);
    
    const countMap = new Map(connectionCounts.map(c => [c.profileId, Number(c.count)]));
    
    // Build response
    const result = targetConnections.map(c => ({
      id: c.profile.id,
      name: c.profile.name,
      profilePicture: c.profile.profilePicture,
      connectionCount: countMap.get(c.profile.id) || 0,
      isConnectedToUser: userConnectionIds.has(c.profile.id),
    }));
    
    // Also return user profile info
    const userProfileData = {
      id: userProfile.id,
      name: userProfile.name,
      profilePicture: userProfile.profilePicture,
      connectionCount: userConnectionIds.size - 1, // Exclude self
      isConnectedToUser: true,
    };
    
    return NextResponse.json({
      userProfile: userProfileData,
      connections: result,
    });
  } catch (error) {
    console.error('Get network tree error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to get network tree' },
      { status: 500 }
    );
  }
}

