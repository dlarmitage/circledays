import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, connections } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq, or, ilike, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }
    
    // Get user's profile
    const [userProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.linkedUserId, user.id))
      .limit(1);
    
    if (!userProfile) {
      return NextResponse.json({ results: [] });
    }
    
    // Search profiles by name
    const searchResults = await db
      .select()
      .from(profiles)
      .where(ilike(profiles.name, `%${query}%`))
      .limit(50);
    
    // Get user's direct connections
    const directConnections = await db
      .select({
        connectedProfileId: sql<string>`
          CASE 
            WHEN ${connections.profileAId} = ${userProfile.id} THEN ${connections.profileBId}
            ELSE ${connections.profileAId}
          END
        `.as('connected_profile_id'),
      })
      .from(connections)
      .where(
        or(
          eq(connections.profileAId, userProfile.id),
          eq(connections.profileBId, userProfile.id)
        )
      );
    
    const directConnectionIds = new Set(
      directConnections.map(c => c.connectedProfileId)
    );
    
    // For each result, determine hop distance and mutual connections
    const results = await Promise.all(
      searchResults.map(async (profile) => {
        // Skip own profile
        if (profile.id === userProfile.id) {
          return null;
        }
        
        let hopDistance: number;
        let mutualCount = 0;
        
        if (directConnectionIds.has(profile.id)) {
          hopDistance = 1;
        } else {
          // Check for 2-hop (mutual connections)
          const profileConnections = await db
            .select({
              connectedProfileId: sql<string>`
                CASE 
                  WHEN ${connections.profileAId} = ${profile.id} THEN ${connections.profileBId}
                  ELSE ${connections.profileAId}
                END
              `.as('connected_profile_id'),
            })
            .from(connections)
            .where(
              or(
                eq(connections.profileAId, profile.id),
                eq(connections.profileBId, profile.id)
              )
            );
          
          const profileConnectionIds = new Set(
            profileConnections.map(c => c.connectedProfileId)
          );
          
          // Count mutual connections
          for (const id of directConnectionIds) {
            if (profileConnectionIds.has(id)) {
              mutualCount++;
            }
          }
          
          hopDistance = mutualCount > 0 ? 2 : 3;
        }
        
        return {
          id: profile.id,
          name: profile.name,
          profilePicture: profile.profilePicture,
          hopDistance,
          mutualConnections: mutualCount,
        };
      })
    );
    
    return NextResponse.json({
      results: results.filter(Boolean).sort((a, b) => a!.hopDistance - b!.hopDistance),
    });
  } catch (error) {
    console.error('Search error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    );
  }
}


