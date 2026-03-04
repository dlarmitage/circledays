import { NextRequest, NextResponse } from 'next/server';
import { db, invites, profiles, users } from '@/lib/db';
import { withPublicHandler } from '@/lib/api-handler';
import { eq } from 'drizzle-orm';

// Get invite details (public endpoint for viewing invite)
// Note: This is a public route with URL params. Since withPublicHandler doesn't
// support params, we wrap the outer function manually and delegate error handling.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const handler = withPublicHandler(async () => {
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
      contact: invite.invite.email, // Contains email or phone depending on contactType
      contactType: invite.invite.contactType,
    });
  }, 'get invite');

  return handler(request);
}
