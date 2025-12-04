import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, connections } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq, or, ilike, sql } from 'drizzle-orm';

// Global profile search for network view
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    
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
      return NextResponse.json({ error: 'User profile not found' }, { status: 400 });
    }
    
    // Get user's direct connection IDs
    const userConnectionRows = await db
      .select()
      .from(connections)
      .where(
        or(
          eq(connections.profileAId, userProfile.id),
          eq(connections.profileBId, userProfile.id)
        )
      );
    
    const userConnectionIds = new Set<string>();
    userConnectionRows.forEach(conn => {
      if (conn.profileAId === userProfile.id) {
        userConnectionIds.add(conn.profileBId);
      } else {
        userConnectionIds.add(conn.profileAId);
      }
    });
    
    // Search all profiles by name
    const searchResults = await db
      .select()
      .from(profiles)
      .where(ilike(profiles.name, `%${query}%`))
      .limit(50);
    
    // Get connection counts for all results
    const allConnectionCounts = await db
      .select({
        profileAId: connections.profileAId,
        profileBId: connections.profileBId,
      })
      .from(connections);
    
    const countMap = new Map<string, number>();
    allConnectionCounts.forEach(conn => {
      countMap.set(conn.profileAId, (countMap.get(conn.profileAId) || 0) + 1);
      countMap.set(conn.profileBId, (countMap.get(conn.profileBId) || 0) + 1);
    });
    
    // Build response with connection status
    const results = searchResults
      .filter(p => p.id !== userProfile.id) // Exclude self
      .map(profile => ({
        id: profile.id,
        name: profile.name,
        profilePicture: profile.profilePicture,
        connectionCount: countMap.get(profile.id) || 0,
        isConnectedToUser: userConnectionIds.has(profile.id),
      }));
    
    // Sort: connected first, then by name
    results.sort((a, b) => {
      if (a.isConnectedToUser !== b.isConnectedToUser) {
        return a.isConnectedToUser ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Network search error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}

