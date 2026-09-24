import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { createSession, setTrustedDevice, logLoginEvent } from '@/lib/auth';
import {
  verifyOtpAttempt,
  markMagicLinkUsed,
  GENERIC_OTP_ERROR,
} from '@/lib/magic-link-token';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = verifyCodeSchema.parse(body);
    const normalizedEmail = email.toLowerCase().trim();

    const verified = await verifyOtpAttempt(normalizedEmail, code);
    if (!verified) {
      return NextResponse.json({ error: GENERIC_OTP_ERROR }, { status: 400 });
    }

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      // Session before burning the OTP — if cookie write fails, code can still be retried
      await createSession(existingUser.id);
      await setTrustedDevice(normalizedEmail);
      await markMagicLinkUsed(verified.id);
      await logLoginEvent(
        existingUser.id,
        'verification_code',
        request.headers.get('user-agent') || undefined
      );
      return NextResponse.json({
        success: true,
        redirect: '/dashboard',
        isNewUser: false,
      });
    }

    // New user — burn token, then send to onboarding (account created there)
    await markMagicLinkUsed(verified.id);
    await setTrustedDevice(normalizedEmail);
    return NextResponse.json({
      success: true,
      redirect: `/onboarding?email=${encodeURIComponent(normalizedEmail)}`,
      isNewUser: true,
    });
  } catch (error) {
    console.error('Verify code error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: GENERIC_OTP_ERROR }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
