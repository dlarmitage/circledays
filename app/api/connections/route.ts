import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, connections, connectionRequests } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq, or, and, sql } from 'drizzle-orm';
import { z } from 'zod';

// Get user's connections
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
      return NextResponse.json({ connections: [] });
    }
    
    // Get all connections with profile data
    const userConnections = await db
      .select({
        connection: connections,
        profile: profiles,
      })
      .from(connections)
      .innerJoin(
        profiles,
        or(
          sql`${connections.profileAId} = ${userProfile.id} AND ${profiles.id} = ${connections.profileBId}`,
          sql`${connections.profileBId} = ${userProfile.id} AND ${profiles.id} = ${connections.profileAId}`
        )
      )
      .where(
        or(
          eq(connections.profileAId, userProfile.id),
          eq(connections.profileBId, userProfile.id)
        )
      );
    
    return NextResponse.json({
      connections: userConnections.map(({ connection, profile }) => ({
        connectionId: connection.id,
        profile,
        createdAt: connection.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get connections error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to get connections' },
      { status: 500 }
    );
  }
}

const createConnectionSchema = z.object({
  profileId: z.string().uuid(),
});

// Create a connection (instant if ≤2 hops, request if >2 hops)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { profileId } = createConnectionSchema.parse(body);
    
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
    
    // Check if already connected
    const [profileA, profileB] = [userProfile.id, targetProfile.id].sort();
    const [existingConnection] = await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.profileAId, profileA),
          eq(connections.profileBId, profileB)
        )
      )
      .limit(1);
    
    if (existingConnection) {
      return NextResponse.json({ error: 'Already connected' }, { status: 400 });
    }
    
    // Calculate hop distance (simplified: check if ≤2 hops)
    const directConnectionIds = await db
      .select({
        connectedId: sql<string>`
          CASE 
            WHEN ${connections.profileAId} = ${userProfile.id} THEN ${connections.profileBId}
            ELSE ${connections.profileAId}
          END
        `.as('connected_id'),
      })
      .from(connections)
      .where(
        or(
          eq(connections.profileAId, userProfile.id),
          eq(connections.profileBId, userProfile.id)
        )
      );
    
    const directIds = new Set(directConnectionIds.map(c => c.connectedId));
    
    // Check if target is within 2 hops
    let withinTwoHops = directIds.has(targetProfile.id);
    
    if (!withinTwoHops) {
      // Check 2-hop: does target share a connection with any of user's connections?
      for (const id of directIds) {
        const [sharedConnection] = await db
          .select()
          .from(connections)
          .where(
            or(
              and(eq(connections.profileAId, id), eq(connections.profileBId, targetProfile.id)),
              and(eq(connections.profileBId, id), eq(connections.profileAId, targetProfile.id))
            )
          )
          .limit(1);
        
        if (sharedConnection) {
          withinTwoHops = true;
          break;
        }
      }
    }
    
    if (withinTwoHops) {
      // Instant connection
      const [newConnection] = await db
        .insert(connections)
        .values({
          profileAId: profileA,
          profileBId: profileB,
          createdByUserId: user.id,
        })
        .returning();
      
      return NextResponse.json({
        connection: newConnection,
        type: 'instant',
      });
    } else {
      // Create connection request
      const [request] = await db
        .insert(connectionRequests)
        .values({
          fromProfileId: userProfile.id,
          toProfileId: targetProfile.id,
          status: 'pending',
        })
        .returning();
      
      // TODO: Send notification to target if they have a linked user
      
      return NextResponse.json({
        request,
        type: 'request',
      });
    }
  } catch (error) {
    console.error('Create connection error:', error);
    
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
      { error: 'Failed to create connection' },
      { status: 500 }
    );
  }
}

