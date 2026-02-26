import { NextResponse } from 'next/server';
import { getCurrentUser, getSession } from '@/lib/auth';
import { db, profiles, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    // Get user's profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.linkedUserId, user.id))
      .limit(1);

    // Check if admin is impersonating
    const session = await getSession();
    let impersonation = null;

    if (session.originalUserId) {
      const [originalUser] = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, session.originalUserId))
        .limit(1);

      if (originalUser) {
        impersonation = {
          isImpersonating: true,
          originalUser: {
            id: originalUser.id,
            name: originalUser.name,
          },
        };
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        pendingEmail: user.pendingEmail,
        name: user.name,
        timezone: user.timezone,
        mobile: user.mobile,
        notificationChannel: user.notificationChannel,
        isPlatformAdmin: user.isPlatformAdmin,
        shareNewConnections: user.shareNewConnections,
      },
      profile: profile || null,
      impersonation,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}
