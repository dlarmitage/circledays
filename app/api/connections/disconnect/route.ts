import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, connections } from '@/lib/db';
import { withAuth } from '@/lib/api-handler';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const disconnectSchema = z.object({
  profileIdA: z.string().uuid(),
  profileIdB: z.string().uuid(),
});

// POST - Disconnect two profiles (admin only)
export const POST = withAuth(async (req, user) => {
  // Only platform admins can disconnect arbitrary connections
  if (!user.isPlatformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data = disconnectSchema.parse(body);

  // Verify both profiles exist
  const [profileA] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, data.profileIdA))
    .limit(1);

  const [profileB] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, data.profileIdB))
    .limit(1);

  if (!profileA || !profileB) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Find connection (order doesn't matter)
  const [profileAId, profileBId] = [data.profileIdA, data.profileIdB].sort();
  const [connection] = await db
    .select()
    .from(connections)
    .where(
      and(
        eq(connections.profileAId, profileAId),
        eq(connections.profileBId, profileBId)
      )
    )
    .limit(1);

  if (!connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }

  // Delete connection
  await db.delete(connections).where(eq(connections.id, connection.id));

  return NextResponse.json({
    success: true,
    message: `Disconnected ${profileA.name} and ${profileB.name}`,
  });
}, 'disconnect');
