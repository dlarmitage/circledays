import { NextResponse } from 'next/server';
import { db, profiles, connections } from '@/lib/db';
import { withAuth } from '@/lib/api-handler';
import { eq, or, sql } from 'drizzle-orm';

interface GraphNode {
  id: string;
  name: string;
  profilePicture: string | null;
  hopDistance: number;
  linkedUserId: string | null;
}

interface GraphEdge {
  source: string;
  target: string;
}

export const GET = withAuth(async (req, user) => {
  // Get user's profile
  const [userProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.linkedUserId, user.id))
    .limit(1);

  if (!userProfile) {
    return NextResponse.json({ nodes: [], edges: [] });
  }

  // Get all 1-hop connections
  const oneHopConnections = await db
    .select({
      profile: profiles,
      connectionId: connections.id,
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

  // Filter out private profiles not created by this user
  const visibleOneHopConnections = oneHopConnections.filter(
    ({ profile }) => !profile.isPrivate || profile.createdByUserId === user.id
  );
  const oneHopIds = new Set(visibleOneHopConnections.map(c => c.profile.id));

  // Get 2-hop connections (connections of connections)
  const twoHopProfiles: Map<string, GraphNode> = new Map();
  const twoHopEdges: GraphEdge[] = [];

  for (const { profile: oneHopProfile } of visibleOneHopConnections) {
    const theirConnections = await db
      .select({
        profile: profiles,
      })
      .from(connections)
      .innerJoin(
        profiles,
        or(
          sql`${connections.profileAId} = ${oneHopProfile.id} AND ${profiles.id} = ${connections.profileBId}`,
          sql`${connections.profileBId} = ${oneHopProfile.id} AND ${profiles.id} = ${connections.profileAId}`
        )
      )
      .where(
        or(
          eq(connections.profileAId, oneHopProfile.id),
          eq(connections.profileBId, oneHopProfile.id)
        )
      );

    for (const { profile: twoHopProfile } of theirConnections) {
      // Skip if it's the user, already a 1-hop connection, or private
      if (twoHopProfile.id === userProfile.id || oneHopIds.has(twoHopProfile.id) || twoHopProfile.isPrivate) {
        continue;
      }

      if (!twoHopProfiles.has(twoHopProfile.id)) {
        twoHopProfiles.set(twoHopProfile.id, {
          id: twoHopProfile.id,
          name: twoHopProfile.name,
          profilePicture: twoHopProfile.profilePicture,
          hopDistance: 2,
          linkedUserId: twoHopProfile.linkedUserId,
        });
      }

      // Add edge from 1-hop to 2-hop
      twoHopEdges.push({
        source: oneHopProfile.id,
        target: twoHopProfile.id,
      });
    }
  }

  // Build nodes array
  const nodes: GraphNode[] = [
    // User at center
    {
      id: userProfile.id,
      name: userProfile.name,
      profilePicture: userProfile.profilePicture,
      hopDistance: 0,
      linkedUserId: userProfile.linkedUserId,
    },
    // 1-hop connections
    ...visibleOneHopConnections.map(({ profile }) => ({
      id: profile.id,
      name: profile.name,
      profilePicture: profile.profilePicture,
      hopDistance: 1,
      linkedUserId: profile.linkedUserId,
    })),
    // 2-hop connections (limit to 100 for performance)
    ...Array.from(twoHopProfiles.values()).slice(0, 100),
  ];

  // Build edges array
  const edges: GraphEdge[] = [
    // Edges from user to 1-hop
    ...visibleOneHopConnections.map(({ profile }) => ({
      source: userProfile.id,
      target: profile.id,
    })),
    // Edges from 1-hop to 2-hop (deduplicated)
    ...twoHopEdges.filter((edge, index, self) =>
      index === self.findIndex(e =>
        (e.source === edge.source && e.target === edge.target) ||
        (e.source === edge.target && e.target === edge.source)
      )
    ),
  ];

  return NextResponse.json({
    nodes,
    edges,
    userProfileId: userProfile.id,
  });
}, 'get network');
