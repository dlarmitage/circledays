import { NextResponse } from 'next/server';
import { db, pushTokens } from '@/lib/db';
import { withAuth } from '@/lib/api-handler';
import { eq } from 'drizzle-orm';
import { sendPushNotification } from '@/lib/apns';

export const POST = withAuth(async (req, user) => {
  // Only allow admin or the user themselves to test
  const tokens = await db
    .select()
    .from(pushTokens)
    .where(eq(pushTokens.userId, user.id));

  if (tokens.length === 0) {
    return NextResponse.json(
      { error: 'No push tokens registered. Enable push notifications in Settings first.' },
      { status: 400 }
    );
  }

  const results = await Promise.all(
    tokens.map((t) =>
      sendPushNotification(t.token, 'CircleDays Test', 'Push notifications are working! 🎉', {
        profileId: '',
      })
    )
  );

  return NextResponse.json({ results, tokenCount: tokens.length });
}, 'test push notification');
