import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, connections } from '@/lib/db';
import { withAuthParams } from '@/lib/api-handler';
import { eq, or } from 'drizzle-orm';

// Delete a connection - user can disconnect from anyone they're connected to
export const DELETE = withAuthParams(async (req, user, params: { id: string }) => {
  const connectionId = params.id;

  // Get user's profile
  const [userProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.linkedUserId, user.id))
    .limit(1);

  if (!userProfile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 400 });
  }

  // Get the connection
  const [connection] = await db
    .select()
    .from(connections)
    .where(eq(connections.id, connectionId))
    .limit(1);

  if (!connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }

  // Verify user is part of this connection
  const isUserInConnection =
    connection.profileAId === userProfile.id ||
    connection.profileBId === userProfile.id;

  if (!isUserInConnection && !user.isPlatformAdmin) {
    return NextResponse.json({ error: 'Not authorized to delete this connection' }, { status: 403 });
  }

  // Delete the connection
  await db
    .delete(connections)
    .where(eq(connections.id, connectionId));

  return NextResponse.json({ success: true });
}, 'delete connection');
