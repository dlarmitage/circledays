import { NextRequest, NextResponse } from 'next/server';
import { db, invites, profiles, users } from '@/lib/db';
import { eq, and, gt } from 'drizzle-orm';

// Get invite details (public endpoint for viewing invite)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Get invite with profile and inviter info
    const [invite] = await db
      .select({
        invite: invites,
        profile: profiles,
      })
      .from(invites)
      .innerJoin(profiles, eq(invites.profileId, profiles.id))
      .where(eq(invites.token, token))
      .limit(1);
    
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }
    
    // Check if expired
    if (new Date() > invite.invite.expiresAt) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 410 });
    }
    
    // Check if already accepted
    if (invite.invite.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invite already used' },
        { status: 410 }
      );
    }
    
    // Get inviter info
    const [inviter] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, invite.invite.invitedByUserId))
      .limit(1);
    
    return NextResponse.json({
      profileName: invite.profile.name,
      profilePicture: invite.profile.profilePicture,
      inviterName: inviter?.name || 'Someone',
      email: invite.invite.email,
    });
  } catch (error) {
    console.error('Get invite error:', error);
    return NextResponse.json(
      { error: 'Failed to get invite' },
      { status: 500 }
    );
  }
}

