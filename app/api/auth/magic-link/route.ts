import { NextRequest, NextResponse } from 'next/server';
import { db, magicLinks, users } from '@/lib/db';
import { sendEmail, generateMagicLinkEmail } from '@/lib/email';
import { nanoid } from 'nanoid';
import { eq, and, gt } from 'drizzle-orm';
import { z } from 'zod';

const requestSchema = z.object({
  email: z.string().email(),
});

// Rate limiting: track requests per email (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(email);

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + 60 * 60 * 1000 }); // 1 hour
    return true;
  }

  if (limit.count >= 5) {
    return false;
  }

  limit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = requestSchema.parse(body);

    // Check rate limit
    if (!checkRateLimit(email.toLowerCase())) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Check if user exists (for personalization)
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    const userName = existingUser[0]?.name || '';

    // Create magic link token and verification code
    const token = nanoid(32);
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalidate any existing unused tokens for this email
    await db
      .update(magicLinks)
      .set({ used: true })
      .where(
        and(
          eq(magicLinks.email, email.toLowerCase()),
          eq(magicLinks.used, false)
        )
      );

    // Create new magic link with code
    await db.insert(magicLinks).values({
      email: email.toLowerCase(),
      token,
      code,
      expiresAt,
    });

    // Send email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const magicLinkUrl = `${appUrl}/api/auth/verify?token=${token}`;

    const { html, text } = generateMagicLinkEmail(userName, magicLinkUrl, code);

    await sendEmail({
      to: email,
      subject: 'Sign in to CircleDays',
      html,
      text,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Magic link error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send magic link' },
      { status: 500 }
    );
  }
}


