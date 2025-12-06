import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, connections } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const disconnectSchema = z.object({
  profileIdA: z.string().uuid(),
  profileIdB: z.string().uuid(),
});

// POST - Disconnect two profiles (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    // Only platform admins can disconnect arbitrary connections
    if (!user.isPlatformAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
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
  } catch (error) {
    console.error('Disconnect error:', error);
    
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
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}

