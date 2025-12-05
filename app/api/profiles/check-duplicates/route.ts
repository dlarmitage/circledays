import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, connections, invites } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq, or, and, ilike, sql } from 'drizzle-orm';

// Check for potential duplicate profiles before creating a new one
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name, birthday } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    // Get user's profile
    const [userProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.linkedUserId, user.id))
      .limit(1);
    
    if (!userProfile) {
      return NextResponse.json({ duplicates: [] });
    }
    
    // Normalize name for comparison
    const normalizedName = name.trim().toLowerCase();
    const nameParts = normalizedName.split(/\s+/);
    
    // Build search conditions
    const searchConditions = [];
    
    // Exact name match (case-insensitive)
    searchConditions.push(ilike(profiles.name, name.trim()));
    
    // If we have first and last name, also search for reversed order
    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      // Search for "LastName FirstName" pattern too
      searchConditions.push(ilike(profiles.name, `${lastName}%${firstName}%`));
      searchConditions.push(ilike(profiles.name, `%${firstName}%${lastName}%`));
    }
    
    // Search for similar profiles
    const similarProfiles = await db
      .select()
      .from(profiles)
      .where(or(...searchConditions))
      .limit(10);
    
    // Get user's existing connections to check if already connected
    const userConnections = await db
      .select()
      .from(connections)
      .where(
        or(
          eq(connections.profileAId, userProfile.id),
          eq(connections.profileBId, userProfile.id)
        )
      );
    
    const connectedProfileIds = new Set<string>();
    userConnections.forEach(conn => {
      if (conn.profileAId === userProfile.id) {
        connectedProfileIds.add(conn.profileBId);
      } else {
        connectedProfileIds.add(conn.profileAId);
      }
    });
    
    // Score and filter duplicates
    const duplicates = similarProfiles
      .filter(p => p.id !== userProfile.id) // Exclude self
      .map(profile => {
        let score = 0;
        let reasons: string[] = [];
        
        // Name similarity
        const profileNameNorm = profile.name.trim().toLowerCase();
        if (profileNameNorm === normalizedName) {
          score += 50;
          reasons.push('Exact name match');
        } else if (profileNameNorm.includes(normalizedName) || normalizedName.includes(profileNameNorm)) {
          score += 30;
          reasons.push('Similar name');
        } else {
          score += 20;
          reasons.push('Partial name match');
        }
        
        // Birthday match (strong signal)
        if (birthday && profile.createdAt) {
          // We don't have birthday on profile directly, but we can check events
          // For now, just flag as potential match
        }
        
        // Already connected?
        const isConnected = connectedProfileIds.has(profile.id);
        if (isConnected) {
          score += 100; // Strong signal - you already know this person
          reasons.push('Already in your connections');
        }
        
        // Created by current user?
        if (profile.createdByUserId === user.id) {
          score += 80;
          reasons.push('You created this profile');
        }
        
        return {
          id: profile.id,
          name: profile.name,
          profilePicture: profile.profilePicture,
          isConnected,
          isLinked: !!profile.linkedUserId,
          score,
          reasons,
        };
      })
      .filter(d => d.score >= 20) // Only show meaningful matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5 matches
    
    return NextResponse.json({ duplicates });
  } catch (error) {
    console.error('Check duplicates error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to check duplicates' },
      { status: 500 }
    );
  }
}

