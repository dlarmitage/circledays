import { NextRequest, NextResponse } from 'next/server';
import { db, exchangeTokens, users } from '@/lib/db';
import { createSession, logLoginEvent } from '@/lib/auth';
import { eq, and, gt } from 'drizzle-orm';
import { z } from 'zod';

const requestSchema = z.object({
  exchangeToken: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { exchangeToken } = requestSchema.parse(body);

    // Find and validate exchange token
    const [token] = await db
      .select()
      .from(exchangeTokens)
      .where(
        and(
          eq(exchangeTokens.token, exchangeToken),
          eq(exchangeTokens.used, false),
          gt(exchangeTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!token) {
      return NextResponse.json(
        { error: 'Invalid or expired exchange token' },
        { status: 401 }
      );
    }

    // Mark token as used
    await db
      .update(exchangeTokens)
      .set({ used: true })
      .where(eq(exchangeTokens.id, token.id));

    // New user — redirect to onboarding
    if (token.isNewUser || !token.userId) {
      return NextResponse.json({
        redirect: `/onboarding?email=${encodeURIComponent(token.email)}`,
      });
    }

    // Existing user — create session in the WebView's cookie context
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, token.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    await createSession(user.id);
    await logLoginEvent(user.id, 'exchange_token', request.headers.get('user-agent') || undefined);

    return NextResponse.json({ redirect: '/dashboard' });
  } catch (error) {
    console.error('Exchange token error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
