import { NextRequest, NextResponse } from 'next/server';
import { db, magicLinks, users, exchangeTokens } from '@/lib/db';
import { createSession, logLoginEvent } from '@/lib/auth';
import { eq, and, gt } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const isNative = searchParams.get('native') === '1';

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=invalid', request.url));
  }

  try {
    // Find and validate magic link
    const [link] = await db
      .select()
      .from(magicLinks)
      .where(
        and(
          eq(magicLinks.token, token),
          eq(magicLinks.used, false),
          gt(magicLinks.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!link) {
      return NextResponse.redirect(new URL('/login?error=expired', request.url));
    }

    // Mark token as used
    await db
      .update(magicLinks)
      .set({ used: true })
      .where(eq(magicLinks.id, link.id));

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, link.email))
      .limit(1);

    // Native app flow: generate exchange token and redirect to custom URL scheme
    if (isNative) {
      const exchangeToken = nanoid(32);
      const expiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds

      await db.insert(exchangeTokens).values({
        userId: existingUser?.id ?? null,
        email: link.email,
        token: exchangeToken,
        isNewUser: !existingUser,
        expiresAt,
      });

      const callbackUrl = existingUser
        ? `circledays://auth/callback?exchange_token=${exchangeToken}`
        : `circledays://auth/callback?exchange_token=${exchangeToken}&new_user=1`;

      return NextResponse.redirect(callbackUrl);
    }

    // Web flow: set session cookie and redirect
    if (existingUser) {
      await createSession(existingUser.id);
      await logLoginEvent(existingUser.id, 'magic_link', request.headers.get('user-agent') || undefined);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // New user - redirect to onboarding with email
    const onboardingUrl = new URL('/onboarding', request.url);
    onboardingUrl.searchParams.set('email', link.email);
    return NextResponse.redirect(onboardingUrl);

  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.redirect(new URL('/login?error=failed', request.url));
  }
}
