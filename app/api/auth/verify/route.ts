import { NextRequest, NextResponse } from 'next/server';
import { db, users, exchangeTokens } from '@/lib/db';
import { createSession, setTrustedDevice, logLoginEvent } from '@/lib/auth';
import { consumeMagicLinkToken } from '@/lib/magic-link-token';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const isNative = searchParams.get('native') === '1';

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=invalid', request.url));
  }

  try {
    // Atomic consume — avoids double-use from scanners / double-clicks
    const consumed = await consumeMagicLinkToken(token);
    if (!consumed) {
      return NextResponse.redirect(new URL('/login?error=expired', request.url));
    }

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, consumed.email))
      .limit(1);

    // Native app flow: generate exchange token and redirect to custom URL scheme
    if (isNative) {
      const exchangeToken = nanoid(32);
      const expiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds

      await db.insert(exchangeTokens).values({
        userId: existingUser?.id ?? null,
        email: consumed.email,
        token: exchangeToken,
        isNewUser: !existingUser,
        expiresAt,
      });

      const callbackUrl = existingUser
        ? `circledays://auth/callback?exchange_token=${exchangeToken}`
        : `circledays://auth/callback?exchange_token=${exchangeToken}&new_user=1`;

      return NextResponse.redirect(callbackUrl);
    }

    // Web flow
    if (existingUser) {
      await createSession(existingUser.id);
      await setTrustedDevice(consumed.email);
      await logLoginEvent(
        existingUser.id,
        'magic_link',
        request.headers.get('user-agent') || undefined
      );
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    await setTrustedDevice(consumed.email);
    const onboardingUrl = new URL('/onboarding', request.url);
    onboardingUrl.searchParams.set('email', consumed.email);
    return NextResponse.redirect(onboardingUrl);
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.redirect(new URL('/login?error=failed', request.url));
  }
}
