import { NextRequest, NextResponse } from 'next/server';
import { db, invites, profiles, users, connections, reminderPreferences, connectionSuggestions } from '@/lib/db';
import { createSession, logLoginEvent } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { withPublicHandler } from '@/lib/api-handler';

const acceptInviteSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email("Please enter a valid email address"),
  mobile: z.string().min(7, "Please enter a valid phone number"),
  timezone: z.string(),
  notificationChannel: z.enum(['email', 'sms', 'both']).default('email'),
});

// Note: This is a public route with URL params. Since withPublicHandler doesn't
// support params, we wrap the outer function manually and delegate error handling.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const handler = withPublicHandler(async (req) => {
    const { token } = await params;
    const body = await req.json();
    const data = acceptInviteSchema.parse(body);

    // Get invite
    const [invite] = await db
      .select()
      .from(invites)
      .where(eq(invites.token, token))
      .limit(1);

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Check if expired
    if (new Date() > invite.expiresAt) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 410 });
    }

    // Check if already accepted
    if (invite.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invite already used' },
        { status: 410 }
      );
    }

    // Check if email already has an account
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in.' },
        { status: 400 }
      );
    }

    // Create user with provided email and mobile
    const [newUser] = await db
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        name: data.name,
        timezone: data.timezone,
        mobile: data.mobile,
        notificationChannel: data.notificationChannel,
      })
      .returning();

    // Link profile to user
    await db
      .update(profiles)
      .set({ linkedUserId: newUser.id })
      .where(eq(profiles.id, invite.profileId));

    // Create default reminder preferences
    await db.insert(reminderPreferences).values({
      userId: newUser.id,
      defaultLeadDays: [0, 1, 7],
    });

    // Create seed connections
    // Note: This does NOT affect existing connection suggestions - suggestions remain independent
    // and will still be shown to the user even if connections are created here
    if (invite.seedConnectionIds && invite.seedConnectionIds.length > 0) {
      // Get user's profile (the one they're claiming)
      const [userProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, invite.profileId))
        .limit(1);

      for (const seedProfileId of invite.seedConnectionIds) {
        // Create connection (ensure consistent ordering)
        const [profileA, profileB] = [userProfile.id, seedProfileId].sort();

        try {
          await db.insert(connections).values({
            profileAId: profileA,
            profileBId: profileB,
            createdByUserId: invite.invitedByUserId,
          });

          // If a connection was created and there are pending suggestions for this profile,
          // mark those suggestions as accepted (since the connection now exists)
          // This prevents duplicate suggestions for already-connected profiles
          await db
            .update(connectionSuggestions)
            .set({ status: 'accepted' })
            .where(
              and(
                eq(connectionSuggestions.toUserId, newUser.id),
                eq(connectionSuggestions.suggestedProfileId, seedProfileId),
                eq(connectionSuggestions.status, 'pending')
              )
            );
        } catch (e) {
          // Ignore duplicate connection errors
        }
      }
    }

    // Mark invite as accepted
    await db
      .update(invites)
      .set({ status: 'accepted' })
      .where(eq(invites.id, invite.id));

    // Create session
    await createSession(newUser.id);
    await logLoginEvent(newUser.id, 'invite_accept', req.headers.get('user-agent') || undefined);

    return NextResponse.json({
      success: true,
      user: newUser,
    });
  }, 'accept invite');

  return handler(request);
}
