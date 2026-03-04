import { NextRequest, NextResponse } from 'next/server';
import { withPublicHandler } from '@/lib/api-handler';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { verifyOptOutToken } from '@/lib/nudge-token';

// One-click opt-out — user clicks this link from the nudge email
export const GET = withPublicHandler(async (request) => {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/settings', request.url));
  }

  const userId = verifyOptOutToken(token);

  if (!userId) {
    // Invalid token — redirect to settings with an error hint
    const url = new URL('/settings', request.url);
    url.searchParams.set('nudgeError', 'invalid');
    return NextResponse.redirect(url);
  }

  // Mark user as opted out
  await db
    .update(users)
    .set({ nudgeOptedOut: true })
    .where(eq(users.id, userId));

  // Redirect to a friendly confirmation page (settings with success param)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://circledays.ambient.technology';
  const url = new URL('/settings', appUrl);
  url.searchParams.set('nudgeOptedOut', 'true');
  return NextResponse.redirect(url);
}, 'nudge opt-out');
