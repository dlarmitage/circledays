import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { sendEmail, generateMagicLinkEmail } from '@/lib/email';
import { sendSms } from '@/lib/sms';
import { createSession, getTrustedDevice, setTrustedDevice, logLoginEvent } from '@/lib/auth';
import { invalidateAndCreateMagicLink } from '@/lib/magic-link-token';
import { maskPhone } from '@/lib/phone';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const requestSchema = z.object({
  email: z.string().email(),
  channel: z.enum(['email', 'sms']).optional(),
  platform: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, channel, platform } = requestSchema.parse(body);
    const normalizedEmail = email.toLowerCase().trim();

    // Never gate on user existence — look up only for personalization / mobile / trusted
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    // Trusted device bypass — skip OTP when this browser already verified this email
    const trustedEmail = await getTrustedDevice();
    if (
      trustedEmail &&
      trustedEmail === normalizedEmail &&
      existingUser
    ) {
      await createSession(existingUser.id);
      await setTrustedDevice(normalizedEmail);
      await logLoginEvent(
        existingUser.id,
        'verification_code',
        request.headers.get('user-agent') || undefined
      );
      return NextResponse.json({
        success: true,
        trusted: true,
        redirect: '/dashboard',
      });
    }

    const mobile = existingUser?.mobile?.trim() || null;

    // Channel choice step — phone on file, client hasn't picked yet
    if (!channel && mobile) {
      return NextResponse.json({
        success: true,
        needsChannel: true,
        phoneMasked: maskPhone(mobile),
      });
    }

    if (channel === 'sms' && !mobile) {
      return NextResponse.json(
        { error: 'No mobile number on file for this account' },
        { status: 400 }
      );
    }

    const deliveryChannel = channel === 'sms' ? 'sms' : 'email';

    const created = await invalidateAndCreateMagicLink(normalizedEmail);
    if ('error' in created) {
      return NextResponse.json({ error: created.error }, { status: created.status });
    }

    const { code } = created;
    const userName = existingUser?.name || '';

    if (deliveryChannel === 'sms' && mobile) {
      const smsBody = `Your CircleDays login code is: ${code}. It expires in 15 minutes.`;
      const result = await sendSms({ to: mobile, body: smsBody });
      if (!result.success) {
        return NextResponse.json(
          { error: 'Failed to send login code' },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        sent: true,
        channel: 'sms',
        phoneMasked: maskPhone(mobile),
      });
    }

    // Email delivery — code-only (no clickable magic-link URL)
    const { html, text } = generateMagicLinkEmail(userName, code);
    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: 'Your CircleDays login code',
      html,
      text,
    });
    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Failed to send login code' },
        { status: 500 }
      );
    }

    // platform reserved for native clients that still use GET verify deep links
    void platform;

    return NextResponse.json({
      success: true,
      sent: true,
      channel: 'email',
    });
  } catch (error) {
    console.error('Magic link error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send login code' },
      { status: 500 }
    );
  }
}
